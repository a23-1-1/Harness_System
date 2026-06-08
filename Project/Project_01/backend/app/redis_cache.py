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

    async def get_client(self) -> aioredis.Redis:
        """获取 Redis 客户端（懒加载）"""
        if self._client is None:
            self._client = aioredis.from_url(
                REDIS_URL,
                decode_responses=True,
                socket_connect_timeout=5,
                socket_keepalive=True,
            )
            # 测试连接
            await self._client.ping()
            logger.info("Redis 缓存连接成功")
        return self._client

    async def close(self):
        """关闭 Redis 连接"""
        if self._client:
            await self._client.aclose()
            self._client = None

    # ─── 会话状态 ──────────────────────────────────────────
    async def set_session(self, conv_id: str, data: dict, ttl: int = 86400):
        """设置活跃对话状态"""
        client = await self.get_client()
        key = f"session:active:{conv_id}"
        await client.setex(key, ttl, json.dumps(data, ensure_ascii=False))

    async def get_session(self, conv_id: str) -> Optional[dict]:
        """获取活跃对话状态"""
        client = await self.get_client()
        key = f"session:active:{conv_id}"
        raw = await client.get(key)
        return json.loads(raw) if raw else None

    async def delete_session(self, conv_id: str):
        """删除活跃对话状态"""
        client = await self.get_client()
        await client.delete(f"session:active:{conv_id}")

    # ─── 消息缓存 ──────────────────────────────────────────
    async def push_message(self, conv_id: str, message: dict, max_len: int = 50):
        """将消息推入对话消息缓存 List"""
        client = await self.get_client()
        key = f"conv:messages:{conv_id}"
        await client.lpush(key, json.dumps(message, ensure_ascii=False))
        await client.ltrim(key, 0, max_len - 1)
        await client.expire(key, 86400)

    async def get_recent_messages(self, conv_id: str, count: int = 50) -> list[dict]:
        """获取最近的 N 条消息"""
        client = await self.get_client()
        key = f"conv:messages:{conv_id}"
        raw_list = await client.lrange(key, 0, count - 1)
        return [json.loads(m) for m in raw_list]

    # ─── LLM 缓存 ─────────────────────────────────────────
    async def cache_llm_response(self, prompt_hash: str, response: str, ttl: int = 3600):
        """缓存 LLM 响应"""
        client = await self.get_client()
        await client.setex(f"llm:cache:{prompt_hash}", ttl, response)

    async def get_llm_cached(self, prompt_hash: str) -> Optional[str]:
        """获取缓存的 LLM 响应"""
        client = await self.get_client()
        return await client.get(f"llm:cache:{prompt_hash}")


# 全局单例
redis_cache = RedisCache()
