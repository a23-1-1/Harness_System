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
async def list_conversations(
    q: str = "",
    teacher_id: str = "",
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """获取对话列表（按更新时间倒序），支持关键词搜索和分页，过滤学生私有对话"""
    # 限制最大长度防滥用
    q = q[:200]

    query = (
        select(Conversation)
        .where(~Conversation.id.like("%:student:%"))
    )
    if teacher_id:
        query = query.where(Conversation.teacher_id == teacher_id)
    if q:
        # 转义 LIKE 通配符，避免用户搜索 "100%" 意外匹配过多结果
        safe_q = q.replace("%", "\\%").replace("_", "\\_")
        like = f"%{safe_q}%"
        query = query.where(
            Conversation.title.ilike(like, escape="\\") |
            Conversation.summary.ilike(like, escape="\\") |
            Conversation.id.ilike(like, escape="\\")
        )
    # 查询总数
    from sqlalchemy import func
    count_q = select(func.count()).select_from(query.subquery())
    total = (await db.execute(count_q)).scalar() or 0

    query = query.order_by(Conversation.updated_at.desc())
    query = query.offset((page - 1) * limit).limit(limit)
    result = await db.execute(query)
    conversations = result.scalars().all()
    logger.info("获取对话列表", extra={"data": {"count": len(conversations), "total": total, "q": q, "teacherId": teacher_id}})
    return {
        "conversations": [conv_to_dict(c) for c in conversations],
        "total": total,
        "page": page,
        "limit": limit,
    }


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


@router.get("/{conv_id}/snapshots")
async def get_snapshots(conv_id: str, limit: int = 20, db: AsyncSession = Depends(get_db)):
    """获取对话的演示版本快照列表"""
    from app.models.conversation import Demo
    result = await db.execute(
        select(Demo)
        .where(Demo.conv_id == conv_id)
        .order_by(Demo.version.desc())
        .limit(limit)
    )
    snapshots = result.scalars().all()
    return {"snapshots": [
        {
            "id": s.id,
            "version": s.version,
            "snapshot_order": s.snapshot_order,
            "title": s.title,
            "demo_type": s.demo_type,
            "created_at": s.created_at.isoformat() if s.created_at else "",
        }
        for s in snapshots
    ]}


@router.get("/{conv_id}/messages")
async def get_messages(
    conv_id: str,
    page: int = 1,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """获取消息历史（分页）"""
    result = await db.execute(
        select(Message)
        .where(Message.conv_id == conv_id)
        .order_by(Message.created_at.desc())
        .offset((page - 1) * limit)
        .limit(limit)
    )
    messages = result.scalars().all()
    # 按时间正序返回
    messages = list(reversed(messages))
    return {"messages": [
        {
            "id": m.id,
            "role": m.role,
            "type": m.type,
            "content": m.content,
            "metadata": m.metadata_,
            "created_at": m.created_at.isoformat() if m.created_at else "",
        }
        for m in messages
    ]}


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
        "last_message_at": (
            conv.last_message_at.isoformat()
            if conv.last_message_at
            else (conv.updated_at.isoformat() if conv.updated_at else "")
        ),
    }
