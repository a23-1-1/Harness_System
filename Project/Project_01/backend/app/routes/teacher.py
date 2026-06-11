"""
DB Demo Studio — 教师 Profile REST API
"""
import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models.teacher import TeacherProfile
from app.redis_cache import redis_cache

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/teacher", tags=["teacher"])


class ProfileUpdate(BaseModel):
    style: Optional[dict] = None
    preferences: Optional[dict] = None


@router.get("/profile")
async def get_teacher_profile(
    teacher_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """获取教师风格配置"""
    # 尝试从 Redis 缓存读取
    try:
        client = await redis_cache.get_client()
        if client:
            cached = await client.get(f"teacher:profile:{teacher_id}")
            if cached:
                logger.info(f"教师 Profile 缓存命中: teacher={teacher_id}")
                return json.loads(cached)
    except Exception:
        pass

    # 从 PG 读取
    result = await db.execute(
        select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        # 返回默认配置
        default = {
            "teacher_id": teacher_id,
            "style": {"formality": "medium", "depth": "medium", "pace": "normal", "examples": "moderate"},
            "preferences": {"language": "zh", "default_llm": "auto", "export_format": "html"},
            "teaching_subjects": [],
        }
        return default

    # 合并默认值，确保未保存的字段也有初始值
    merged_style = dict({"formality": "medium", "depth": "medium", "pace": "normal", "examples": "moderate"})
    merged_style.update(profile.style or {})
    merged_prefs = dict({"language": "zh", "default_llm": "auto", "export_format": "html"})
    merged_prefs.update(profile.preferences or {})

    result_dict = {
        "teacher_id": profile.teacher_id,
        "style": merged_style,
        "preferences": merged_prefs,
        "teaching_subjects": profile.teaching_subjects or [],
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else "",
    }

    # 写入缓存
    try:
        client = await redis_cache.get_client()
        if client:
            await client.setex(f"teacher:profile:{teacher_id}", 3600, json.dumps(result_dict, ensure_ascii=False))
    except Exception:
        pass

    return result_dict


@router.post("/profile")
async def save_teacher_profile(
    data: ProfileUpdate,
    teacher_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """保存教师风格配置"""
    result = await db.execute(
        select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        profile = TeacherProfile(teacher_id=teacher_id)
        db.add(profile)

    if data.style is not None:
        current_style = dict(profile.style or {})
        current_style.update(data.style)
        profile.style = current_style
    if data.preferences is not None:
        current_prefs = dict(profile.preferences or {})
        current_prefs.update(data.preferences)
        profile.preferences = current_prefs

    await db.flush()

    # 清除缓存
    try:
        client = await redis_cache.get_client()
        if client:
            await client.delete(f"teacher:profile:{teacher_id}")
    except Exception:
        pass

    logger.info(f"教师 Profile 已更新: teacher={teacher_id}")

    # 合并默认值，确保返回完整字段
    merged_style = dict({"formality": "medium", "depth": "medium", "pace": "normal", "examples": "moderate"})
    merged_style.update(profile.style or {})
    merged_prefs = dict({"language": "zh", "default_llm": "auto", "export_format": "html"})
    merged_prefs.update(profile.preferences or {})

    return {
        "teacher_id": profile.teacher_id,
        "style": merged_style,
        "preferences": merged_prefs,
        "teaching_subjects": profile.teaching_subjects or [],
    }
