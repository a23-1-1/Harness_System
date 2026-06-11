"""
DB Demo Studio — 对话历史加载（WebSocket conv:loaded）
"""
import logging
from sqlalchemy import select

from app.database import async_session_factory
from app.models.conversation import Message

logger = logging.getLogger(__name__)


def _message_to_ws_events(msg: Message) -> list[dict]:
    """将 PG 消息转为前端 WebSocket 事件序列。"""
    content = msg.content if isinstance(msg.content, dict) else {}
    metadata = msg.metadata_ if isinstance(msg.metadata_, dict) else {}

    if msg.role == "user":
        text = content.get("text", "")
        if not text and isinstance(content, str):
            text = content
        return [{
            "event": "chat:message",
            "payload": {
                "type": msg.type,
                "content": text,
                "role": "user",
                "msgId": msg.id,
            },
        }]

    if msg.type == "demo_snapshot":
        return [{
            "event": "demo:complete",
            "payload": {
                "demoId": metadata.get("demoId", f"demo_{msg.id}"),
                "title": content.get("title", "演示"),
                "steps": content.get("steps", []),
                "demo_type": metadata.get("demoType") or content.get("demo_type"),
            },
        }]

    return []


async def load_conv_ws_messages(conv_id: str, limit: int = 200) -> list[dict]:
    """加载对话历史并转为 WebSocket 消息格式（时间正序）。"""
    if not conv_id or conv_id == "default":
        return []

    async with async_session_factory() as db:
        result = await db.execute(
            select(Message)
            .where(Message.conv_id == conv_id)
            .order_by(Message.created_at.desc())
            .limit(limit)
        )
        rows = list(reversed(result.scalars().all()))

    events: list[dict] = []
    for msg in rows:
        events.extend(_message_to_ws_events(msg))

    logger.info(
        "对话历史已加载",
        extra={"data": {"convId": conv_id, "pgCount": len(rows), "wsCount": len(events)}},
    )
    return events
