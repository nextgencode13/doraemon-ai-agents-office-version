import uuid
from datetime import UTC, datetime
from enum import StrEnum

from sqlalchemy import JSON, Column, DateTime, String, Text

from app.db.session import Base


def utc_now():
    return datetime.now(UTC)


class MemoryCategory(StrEnum):
    GENERAL = "general"
    WORK = "work"
    PREFERENCE = "preference"
    FACT = "fact"
    PROJECT = "project"
    SYSTEM = "system"


class Memory(Base):
    __tablename__ = "memories"

    id = Column(String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    content = Column(Text, nullable=False)
    category = Column(String(64), default=MemoryCategory.GENERAL.value, nullable=False)
    tags = Column(JSON, nullable=True, default=list)
    embedding = Column(JSON, nullable=True)  # Stores float array vector embedding
    source = Column(String(64), default="user", nullable=False)  # user, ai_inferred, tool
    created_at = Column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
