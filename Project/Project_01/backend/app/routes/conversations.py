"""
DB Demo Studio — 对话 REST API

多对话 CRUD（创建/读取/更新/删除/列表）
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/conversations", tags=["conversations"])


# ─── 内存存储（TODO: feat-001 完成后替换为 PostgreSQL） ────
_conversations: dict[str, dict] = {}


# ─── 数据模型 ────────────────────────────────────────────────
class ConversationCreate(BaseModel):
    title: Optional[str] = None
    teacher_id: str = "default"


class ConversationUpdate(BaseModel):
    title: Optional[str] = None
    status: Optional[str] = None
    tags: Optional[list[str]] = None


class ConversationResponse(BaseModel):
    id: str
    teacher_id: str
    title: str
    status: str
    message_count: int
    created_at: str
    updated_at: str


# ─── API 端点 ────────────────────────────────────────────────
@router.get("")
async def list_conversations():
    """获取对话列表"""
    return {
        "conversations": sorted(
            _conversations.values(),
            key=lambda c: c["updated_at"],
            reverse=True,
        )
    }


@router.post("")
async def create_conversation(data: ConversationCreate):
    """创建新对话"""
    conv_id = f"conv_{uuid.uuid4().hex[:12]}"
    now = datetime.now(tz=timezone.utc).isoformat()
    _conversations[conv_id] = {
        "id": conv_id,
        "teacher_id": data.teacher_id,
        "title": data.title or f"新对话 ({len(_conversations) + 1})",
        "status": "active",
        "demo_type": None,
        "tags": [],
        "message_count": 0,
        "snapshot_count": 0,
        "summary": "",
        "created_at": now,
        "updated_at": now,
    }
    return _conversations[conv_id]


@router.get("/{conv_id}")
async def get_conversation(conv_id: str):
    """获取对话详情"""
    conv = _conversations.get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    return conv


@router.patch("/{conv_id}")
async def update_conversation(conv_id: str, data: ConversationUpdate):
    """更新对话"""
    conv = _conversations.get(conv_id)
    if not conv:
        raise HTTPException(status_code=404, detail="对话不存在")
    if data.title is not None:
        conv["title"] = data.title
    if data.status is not None:
        conv["status"] = data.status
    if data.tags is not None:
        conv["tags"] = data.tags
    conv["updated_at"] = datetime.now(tz=timezone.utc).isoformat()
    return conv


@router.delete("/{conv_id}")
async def delete_conversation(conv_id: str):
    """删除对话"""
    if conv_id not in _conversations:
        raise HTTPException(status_code=404, detail="对话不存在")
    del _conversations[conv_id]
    return {"status": "deleted", "id": conv_id}
