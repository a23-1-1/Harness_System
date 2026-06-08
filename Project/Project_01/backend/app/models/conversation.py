"""
DB Demo Studio — 数据模型

对话 / 消息 / 演示 的 SQLAlchemy 异步模型。
与 docker/backend/init-db.sql 中的 PostgreSQL schema 保持一致。
"""
import uuid
from datetime import datetime, timezone
from sqlalchemy import Column, String, Integer, Text, JSON, DateTime, ForeignKey, CheckConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship
from app.database import Base


def _utcnow():
    return datetime.now(tz=timezone.utc)


def _uuid():
    return f"conv_{uuid.uuid4().hex[:12]}"


class Conversation(Base):
    """对话表"""
    __tablename__ = "conversations"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    teacher_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    title: Mapped[str] = mapped_column(String(256), default="")
    status: Mapped[str] = mapped_column(
        String(16), default="active",
        CheckConstraint("status IN ('active','draft','finalized','archived')"),
    )
    demo_type: Mapped[str | None] = mapped_column(String(8), nullable=True)
    tags = Column(JSON, default=list)
    message_count: Mapped[int] = mapped_column(Integer, default=0)
    snapshot_count: Mapped[int] = mapped_column(Integer, default=0)
    summary: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=_utcnow, onupdate=_utcnow
    )

    # 关系
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    """消息表"""
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"msg_{uuid.uuid4().hex[:12]}")
    conv_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[str] = mapped_column(
        String(16), nullable=False,
        CheckConstraint("role IN ('user','assistant','system','agent')"),
    )
    type: Mapped[str] = mapped_column(
        String(24), nullable=False,
        CheckConstraint("type IN ('text','sql','image','demo_snapshot','tool_call','quiz','knowledge')"),
    )
    content = Column(JSON, nullable=False, default=dict)
    metadata_ = Column("metadata", JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    # 关系
    conversation = relationship("Conversation", back_populates="messages")


class Demo(Base):
    """演示快照表"""
    __tablename__ = "demos"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: f"demo_{uuid.uuid4().hex[:12]}")
    conv_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("conversations.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, default=1)
    snapshot_order: Mapped[int] = mapped_column(Integer, default=1)
    title = Column(JSON, default=dict)
    demo_type: Mapped[str] = mapped_column(String(32), default="text")
    content = Column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
