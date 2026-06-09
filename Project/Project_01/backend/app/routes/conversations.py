"""
DB Demo Studio — 对话 REST API（PostgreSQL 持久化版）

多对话 CRUD（创建/读取/更新/删除/列表）
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select, delete
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.conversation import Conversation, Message

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/conversations", tags=["conversations"])


# ─── Pydantic 数据模型 ────────────────────────────────────────
class ConversationCreate(BaseModel):
    title: Optional[str] = None
    teacher_id: str = "default"


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None


# ─── API 端点 ────────────────────────────────────────────────
@router.get("")
async def list_conversations(db: AsyncSession = Depends(get_db)):
    """获取对话列表（按更新时间倒序），过滤学生私有对话"""
    result = await db.execute(
        select(Conversation)
        .where(~Conversation.id.like("%:student:%"))
        .order_by(Conversation.updated_at.desc())
    )
    conversations = result.scalars().all()
    logger.info("获取对话列表", extra={"data": {"count": len(conversations)}})
    return {"conversations": [conv_to_dict(c) for c in conversations]}


@router.post("")
async def create_conversation(data: ConversationCreate, db: AsyncSession = Depends(get_db)):
    """创建新对话"""
    conv = Conversation(
        teacher_id=data.teacher_id,
        title=data.title or f"新对话",
    )
    db.add(conv)
    await db.flush()
    logger.info("创建对话", extra={"data": {"id": conv.id, "title": conv.title}})
    return conv_to_dict(conv)


@router.get("/{conv_id}")
async def get_conversation(conv_id: str, db: AsyncSession = Depends(get_db)):
    """获取对话详情"""
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    return conv_to_dict(conv)


@router.patch("/{conv_id}")
async def update_conversation(
    conv_id: str, data: ConversationUpdate, db: AsyncSession = Depends(get_db)
):
    """更新对话（标题/状态/标签）"""
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    if data.title is not None:
        conv.title = data.title
    if data.status is not None:
        conv.status = data.status
    if data.tags is not None:
        conv.tags = data.tags
    await db.flush()
    logger.info("更新对话", extra={"data": {"id": conv_id, "title": conv.title}})
    return conv_to_dict(conv)


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str, db: AsyncSession = Depends(get_db)):
    """删除对话及其关联消息"""
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    await db.delete(conv)
    logger.info("删除对话", extra={"data": {"id": conv_id}})
    return {"status": "deleted", "id": conv_id}


# ─── 辅助函数 ────────────────────────────────────────────────
def conv_to_dict(conv: Conversation) -> dict:
    """将 ORM 对象转为可序列化的字典"""
    return {
        "id": conv.id,
        "teacher_id": conv.teacher_id,
        "title": conv.title,
        "status": conv.status,
        "demo_type": conv.demo_type,
        "tags": conv.tags if conv.tags else [],
        "message_count": conv.message_count,
        "snapshot_count": conv.snapshot_count,
        "summary": conv.summary,
        "created_at": conv.created_at.isoformat() if conv.created_at else "",
        "updated_at": conv.updated_at.isoformat() if conv.updated_at else "",
    }
