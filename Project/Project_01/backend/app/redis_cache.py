"""
DB Demo Studio — Redis 会话缓存

管理活跃对话状态、消息缓存、LLM 缓存。
"""
import os
import json
import logging
from typing import Optional

import redis.asyncio as aioredis

logger = logging.getLogger(__name__)

REDIS_URL = os.getenv("REDIS_URL", "redis://localhost:6379/0")


class RedisCache:
    """Redis 缓存管理器"""

    def __init__(self):
        self._client: Optional[aioredis.Redis] = None

    async def get_client(self) -> aioredis.Redis | None:
        """获取 Redis 客户端（懒加载），不可用时返回 None"""
        if self._client is None or self._client is False:
            try:
                self._client = aioredis.from_url(
                    REDIS_URL,
                    decode_responses=True,
                    socket_connect_timeout=5,
                    socket_keepalive=True,
                )
                await self._client.ping()
                logger.info("Redis 缓存连接成功")
            except Exception as e:
                logger.warning(f"Redis 连接失败，功能降级: {e}")
                self._client = False  # 标记为不可用，避免每次重试
                return None
        return self._client if self._client else None

    async def close(self):
        """关闭 Redis 连接"""
        if self._client:
            await self._client.aclose()
            self._client = None

    # ─── 会话状态 ──────────────────────────────────────────
    async def set_session(self, conv_id: str, data: dict, ttl: int = 86400):
        """设置活跃对话状态"""
        try:
            client = await self.get_client()
            if client is None: return
            key = f"session:active:{conv_id}"
            await client.setex(key, ttl, json.dumps(data, ensure_ascii=False))
        except Exception:
            pass

    async def get_session(self, conv_id: str) -> Optional[dict]:
        """获取活跃对话状态"""
        try:
            client = await self.get_client()
            if client is None: return None
            key = f"session:active:{conv_id}"
            raw = await client.get(key)
            return json.loads(raw) if raw else None
        except Exception:
            return None

    async def delete_session(self, conv_id: str):
        """删除活跃对话状态"""
        try:
            client = await self.get_client()
            if client is None: return
            await client.delete(f"session:active:{conv_id}")
        except Exception:
            pass

    # ─── 消息缓存 ──────────────────────────────────────────
    async def push_message(self, conv_id: str, message: dict, max_len: int = 50):
        """将消息推入对话消息缓存 List（Redis 不可用时静默降级）"""
        try:
            client = await self.get_client()
            key = f"conv:messages:{conv_id}"
            await client.lpush(key, json.dumps(message, ensure_ascii=False))
            await client.ltrim(key, 0, max_len - 1)
            await client.expire(key, 86400)
        except Exception:
            logger.warning(f"push_message 失败（Redis 可能不可用）: conv={conv_id}")

    async def get_recent_messages(self, conv_id: str, count: int = 50) -> list[dict]:
        """获取最近的 N 条消息"""
        try:
            client = await self.get_client()
            if client is None: return []
            key = f"conv:messages:{conv_id}"
            raw_list = await client.lrange(key, 0, count - 1)
            return [json.loads(m) for m in raw_list]
        except Exception:
            return []

    # ─── LLM 缓存 ─────────────────────────────────────────
    async def cache_llm_response(self, prompt_hash: str, response: str, ttl: int = 3600):
        """缓存 LLM 响应"""
        try:
            client = await self.get_client()
            if client is None: return
            await client.setex(f"llm:cache:{prompt_hash}", ttl, response)
        except Exception:
            pass

    async def get_llm_cached(self, prompt_hash: str) -> Optional[str]:
        """获取缓存的 LLM 响应"""
        try:
            client = await self.get_client()
            if client is None: return None
            return await client.get(f"llm:cache:{prompt_hash}")
        except Exception:
            return None


# 全局单例
redis_cache = RedisCache()
