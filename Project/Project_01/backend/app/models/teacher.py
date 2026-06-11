"""
DB Demo Studio — 教师 Profile 模型
"""
from datetime import datetime, timezone
from sqlalchemy import Column, String, JSON, DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def _utcnow():
    return datetime.now(tz=timezone.utc)


class TeacherProfile(Base):
    """教师风格/偏好 Profile 表"""
    __tablename__ = "teacher_profiles"

    teacher_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    display_name: Mapped[str] = mapped_column(String(128), default="")
    email: Mapped[str] = mapped_column(String(256), default="")
    avatar_url: Mapped[str] = mapped_column(String(512), default="")
    role: Mapped[str] = mapped_column(String(32), default="teacher")
    style = Column(JSON, default=dict)       # {formality, depth, pace, examples, notes}
    preferences = Column(JSON, default=dict) # {language, default_llm, export_format}
    teaching_subjects = Column(JSON, default=list)  # ["JOIN", "索引", "事务"]
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
