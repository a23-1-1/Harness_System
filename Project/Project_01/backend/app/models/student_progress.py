"""
DB Demo Studio — 学生进度/掌握度模型
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Float, JSON, DateTime, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base


def _utcnow():
    return datetime.now(tz=timezone.utc)


class StudentProgress(Base):
    """学生掌握度追踪表"""
    __tablename__ = "student_progress"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"sp_{uuid.uuid4().hex[:12]}")
    student_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    teacher_id: Mapped[str] = mapped_column(String(64), nullable=False, default="default")
    subject: Mapped[str] = mapped_column(String(128), default="")  # 知识点/课程节点
    quiz_answers = Column(JSON, default=list)   # [{questionId, correct, timestamp}]
    mastery = Column(JSON, default=dict)        # {knowledgeNode: 0.0-1.0}
    total_questions: Mapped[int] = mapped_column(Integer, default=0)
    correct_answers: Mapped[int] = mapped_column(Integer, default=0)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)
