"""
DB Demo Studio — Redis 速率限制中间件

基于 Redis Sorted Set 的滑动窗口限流。
Redis 不可用时降级为内存级限流。
"""
import asyncio
import json
import logging
import time
from typing import Optional

from fastapi import Request, HTTPException
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)

# 内存级限流（Redis 降级时使用）—— 限制最大 10000 个 key 防内存泄漏
_MAX_MEMORY_KEYS = 10000
_in_memory_counts: dict[str, list[float]] = {}
_memory_lock = asyncio.Lock()


class RateLimitMiddleware(BaseHTTPMiddleware):
    """速率限制中间件

    配置：
        limit: 窗口内最大请求数（默认 60）
        window: 滑动窗口秒数（默认 60）
        routes: 要限流的路由前缀（默认 ["/api/"]）
        ws_limits: WebSocket 事件限流（默认 30/60s）
    """

    def __init__(
        self,
        app,
        limit: int = 60,
        window: int = 60,
        routes: Optional[list[str]] = None,
        ws_event_limit: int = 30,
        ws_window: int = 60,
    ):
        super().__init__(app)
        self.limit = limit
        self.window = window
        self.routes = routes or ["/api/"]
        self.ws_event_limit = ws_event_limit
        self.ws_window = ws_window

    async def dispatch(self, request: Request, call_next):
        # 只限流 API 路由
        path = request.url.path
        if not any(path.startswith(r) for r in self.routes):
            return await call_next(request)

        client_ip = request.client.host if request.client else "unknown"
        key = f"ratelimit:{client_ip}:{path}"

        allowed = await self._check_rate_limit(key, self.limit, self.window)
        if not allowed:
            logger.warning(f"速率限制触发: ip={client_ip}, path={path}")
            return JSONResponse(
                status_code=429,
                content={"error": "请求过于频繁，请稍后重试", "code": "RATE_LIMITED"},
            )

        return await call_next(request)

    async def _check_rate_limit(self, key: str, limit: int, window: int) -> bool:
        """检查是否超过速率限制"""
        now = time.time()
        try:
            client = await redis_cache.get_client()
            if client:
                return await self._redis_check(client, key, limit, window, now)
        except Exception:
            pass
        # Redis 不可用时降级为内存限流
        return await self._memory_check(key, limit, window, now)

    @staticmethod
    async def _redis_check(client, key: str, limit: int, window: int, now: float) -> bool:
        """Redis Sorted Set 滑动窗口"""
        min_score = now - window
        # 清理窗口外的旧记录
        await client.zremrangebyscore(key, 0, min_score)
        # 统计窗口内请求数
        count = await client.zcard(key)
        if count >= limit:
            return False
        # 加入当前请求
        await client.zadd(key, {str(now): now})
        await client.expire(key, window + 60)
        return True

    @staticmethod
    async def _memory_check(key: str, limit: int, window: int, now: float) -> bool:
        """内存级滑动窗口降级"""
        global _in_memory_counts
        async with _memory_lock:
            # 限制总 key 数防内存泄漏
            if len(_in_memory_counts) >= _MAX_MEMORY_KEYS:
                _in_memory_counts.clear()
            records = _in_memory_counts.get(key, [])
            # 清理过期
            cutoff = now - window
            records = [r for r in records if r > cutoff]
            if len(records) >= limit:
                return False
            records.append(now)
            _in_memory_counts[key] = records
            return True


# WebSocket 事件限流函数（供 manager.py 调用）
async def check_ws_rate_limit(conv_id: str, teacher_id: str) -> bool:
    """按 conv 的 WebSocket 事件限流"""
    now = time.time()
    key = f"ratelimit:ws:{conv_id}:{teacher_id}"
    limit = 30
    window = 60

    try:
        client = await redis_cache.get_client()
        if client:
            min_score = now - window
            await client.zremrangebyscore(key, 0, min_score)
            count = await client.zcard(key)
            if count >= limit:
                return False
            await client.zadd(key, {str(now): now})
            await client.expire(key, window + 60)
            return True
    except Exception:
        pass

    return True  # Redis 不可用时放行
