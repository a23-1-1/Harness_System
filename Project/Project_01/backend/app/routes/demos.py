"""
DB Demo Studio — 演示对比 & 复用 REST API
"""
import logging
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.conversation import Conversation, Message, Demo

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/demos", tags=["demos"])


@router.get("/{demo_id}")
async def get_demo(demo_id: str, db: AsyncSession = Depends(get_db)):
    """获取单个 DemoPackage 详情"""
    result = await db.execute(select(Demo).where(Demo.id == demo_id))
    demo = result.scalar_one_or_none()
    if not demo:
        raise HTTPException(status_code=404, detail="演示不存在")
    return {
        "id": demo.id,
        "conv_id": demo.conv_id,
        "version": demo.version,
        "snapshot_order": demo.snapshot_order,
        "title": demo.title,
        "demo_type": demo.demo_type,
        "content": demo.content,
        "created_at": demo.created_at.isoformat() if demo.created_at else "",
    }


class CompareRequest(BaseModel):
    version_a: int
    version_b: int


@router.post("/{conv_id}/compare")
async def compare_versions(
    conv_id: str, data: CompareRequest, db: AsyncSession = Depends(get_db)
):
    """对比两个版本的演示快照"""
    # 分别检查两个版本是否存在，给出明确提示
    demo_a = await db.execute(
        select(Demo).where(Demo.conv_id == conv_id, Demo.version == data.version_a)
    )
    if not demo_a.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"版本 {data.version_a} 不存在")
    demo_b = await db.execute(
        select(Demo).where(Demo.conv_id == conv_id, Demo.version == data.version_b)
    )
    if not demo_b.scalar_one_or_none():
        raise HTTPException(status_code=404, detail=f"版本 {data.version_b} 不存在")

    result = await db.execute(
        select(Demo)
        .where(Demo.conv_id == conv_id, Demo.version.in_([data.version_a, data.version_b]))
        .order_by(Demo.version.asc())
    )
    demos = result.scalars().all()

    v_a, v_b = demos[0], demos[1]
    steps_a = v_a.content.get("steps", []) if v_a.content else []
    steps_b = v_b.content.get("steps", []) if v_b.content else []

    # 差异分析：按索引逐步骤对比
    diffs = []
    max_len = max(len(steps_a), len(steps_b))
    for i in range(max_len):
        step_a = steps_a[i] if i < len(steps_a) else {"title": "(无)", "content": ""}
        step_b = steps_b[i] if i < len(steps_b) else {"title": "(无)", "content": ""}
        if step_a.get("content") != step_b.get("content"):
            diffs.append({
                "index": i + 1,
                "stage": step_b.get("stage", step_a.get("stage", "")),
                "title_a": step_a.get("title", ""),
                "title_b": step_b.get("title", ""),
                "content_a": step_a.get("content", ""),
                "content_b": step_b.get("content", ""),
            })

    return {
        "version_a": v_a.version,
        "version_b": v_b.version,
        "title_a": v_a.title,
        "title_b": v_b.title,
        "total_steps_a": len(steps_a),
        "total_steps_b": len(steps_b),
        "diffs": diffs,
        "diff_count": len(diffs),
    }


class CopyRequest(BaseModel):
    title: Optional[str] = None
    modifications: Optional[str] = ""


@router.post("/{conv_id}/copy")
async def copy_demo(
    conv_id: str, data: CopyRequest, db: AsyncSession = Depends(get_db)
):
    """基于已有演示创建新对话（复用改编）

    复制最新的演示快照到一个新对话中。
    如果指定了 modifications，会写入新对话的 summary 供前端后续 AI 调整。
    """
    # 查找源对话
    result = await db.execute(select(Conversation).where(Conversation.id == conv_id))
    src_conv = result.scalar_one_or_none()
    if not src_conv:
        raise HTTPException(status_code=404, detail="源对话不存在")

    # 查找最新演示快照
    result = await db.execute(
        select(Demo).where(Demo.conv_id == conv_id).order_by(Demo.version.desc()).limit(1)
    )
    latest_demo = result.scalar_one_or_none()

    # 创建新对话
    new_conv = Conversation(
        teacher_id=src_conv.teacher_id,
        title=data.title or f"{src_conv.title} (改编)",
        status="draft",
        summary=data.modifications or f"基于 {src_conv.title} 改编",
    )
    db.add(new_conv)
    await db.flush()

    # 如果有演示快照，复制到新对话
    if latest_demo:
        new_demo = Demo(
            conv_id=new_conv.id,
            version=1,
            snapshot_order=1,
            title=latest_demo.title,
            demo_type=latest_demo.demo_type,
            content=latest_demo.content,
        )
        db.add(new_demo)
        new_conv.snapshot_count = 1

    await db.commit()

    logger.info(f"演示复用: {conv_id} → {new_conv.id}, title={new_conv.title}")
    return {
        "conversation": {
            "id": new_conv.id,
            "title": new_conv.title,
            "status": new_conv.status,
            "message_count": new_conv.message_count,
            "snapshot_count": new_conv.snapshot_count,
            "summary": new_conv.summary,
            "created_at": new_conv.created_at.isoformat() if new_conv.created_at else "",
            "updated_at": new_conv.updated_at.isoformat() if new_conv.updated_at else "",
        }
    }
