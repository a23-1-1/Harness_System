"""
DB Demo Studio — 教师 Profile REST API（MVP 用户管理）
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

DEFAULT_STYLE = {"formality": "medium", "depth": "medium", "pace": "normal", "examples": "moderate"}
DEFAULT_PREFS = {"language": "zh", "default_llm": "auto", "export_format": "html"}


class ProfileUpdate(BaseModel):
    display_name: Optional[str] = None
    email: Optional[str] = None
    avatar_url: Optional[str] = None
    style: Optional[dict] = None
    preferences: Optional[dict] = None
    teaching_subjects: Optional[list[str]] = None


def profile_to_dict(profile: TeacherProfile) -> dict:
    merged_style = dict(DEFAULT_STYLE)
    merged_style.update(profile.style or {})
    merged_prefs = dict(DEFAULT_PREFS)
    merged_prefs.update(profile.preferences or {})
    return {
        "teacher_id": profile.teacher_id,
        "display_name": profile.display_name or profile.teacher_id,
        "email": profile.email or "",
        "avatar_url": profile.avatar_url or "",
        "role": profile.role or "teacher",
        "style": merged_style,
        "preferences": merged_prefs,
        "teaching_subjects": profile.teaching_subjects or [],
        "updated_at": profile.updated_at.isoformat() if profile.updated_at else "",
    }


def default_profile(teacher_id: str) -> dict:
    return {
        "teacher_id": teacher_id,
        "display_name": teacher_id if teacher_id != "default" else "默认教师",
        "email": "",
        "avatar_url": "",
        "role": "teacher",
        "style": dict(DEFAULT_STYLE),
        "preferences": dict(DEFAULT_PREFS),
        "teaching_subjects": [],
        "updated_at": "",
    }


async def _get_or_create_profile(teacher_id: str, db: AsyncSession) -> TeacherProfile:
    result = await db.execute(
        select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        profile = TeacherProfile(
            teacher_id=teacher_id,
            display_name=default_profile(teacher_id)["display_name"],
            role="teacher",
        )
        db.add(profile)
        await db.flush()
        logger.info("自动创建教师 Profile", extra={"data": {"teacherId": teacher_id}})
    return profile


@router.get("/profile")
async def get_teacher_profile(
    teacher_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """获取教师/用户资料"""
    try:
        client = await redis_cache.get_client()
        if client:
            cached = await client.get(f"teacher:profile:{teacher_id}")
            if cached:
                logger.info(f"教师 Profile 缓存命中: teacher={teacher_id}")
                return json.loads(cached)
    except Exception:
        pass

    result = await db.execute(
        select(TeacherProfile).where(TeacherProfile.teacher_id == teacher_id)
    )
    profile = result.scalar_one_or_none()

    if not profile:
        result_dict = default_profile(teacher_id)
    else:
        result_dict = profile_to_dict(profile)

    try:
        client = await redis_cache.get_client()
        if client:
            await client.setex(
                f"teacher:profile:{teacher_id}",
                3600,
                json.dumps(result_dict, ensure_ascii=False),
            )
    except Exception:
        pass

    return result_dict


@router.patch("/profile")
async def patch_teacher_profile(
    data: ProfileUpdate,
    teacher_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """更新教师/用户资料（部分字段）"""
    profile = await _get_or_create_profile(teacher_id, db)

    if data.display_name is not None:
        profile.display_name = data.display_name.strip()[:128]
    if data.email is not None:
        profile.email = data.email.strip()[:256]
    if data.avatar_url is not None:
        profile.avatar_url = data.avatar_url.strip()[:512]
    if data.style is not None:
        current_style = dict(profile.style or {})
        current_style.update(data.style)
        profile.style = current_style
    if data.preferences is not None:
        current_prefs = dict(profile.preferences or {})
        current_prefs.update(data.preferences)
        profile.preferences = current_prefs
    if data.teaching_subjects is not None:
        profile.teaching_subjects = data.teaching_subjects

    await db.flush()

    try:
        client = await redis_cache.get_client()
        if client:
            await client.delete(f"teacher:profile:{teacher_id}")
    except Exception:
        pass

    logger.info(f"教师 Profile 已更新: teacher={teacher_id}")
    return profile_to_dict(profile)


@router.post("/profile")
async def save_teacher_profile(
    data: ProfileUpdate,
    teacher_id: str = "default",
    db: AsyncSession = Depends(get_db),
):
    """保存教师风格配置（兼容旧 POST 客户端）"""
    return await patch_teacher_profile(data, teacher_id, db)
