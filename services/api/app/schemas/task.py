from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models.task import TaskPriority, TaskStatus


class TaskCreate(BaseModel):
    title: str = Field(..., min_length=1, max_length=255)
    description: str | None = None
    priority: TaskPriority = TaskPriority.MEDIUM
    status: TaskStatus = TaskStatus.TODO
    due_date: datetime | None = None
    estimated_minutes: int | None = Field(30, ge=1)
    tags: list[str] | None = Field(default_factory=list)


class TaskUpdate(BaseModel):
    title: str | None = Field(None, min_length=1, max_length=255)
    description: str | None = None
    priority: TaskPriority | None = None
    status: TaskStatus | None = None
    due_date: datetime | None = None
    estimated_minutes: int | None = Field(None, ge=1)
    tags: list[str] | None = None


class TaskRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    description: str | None = None
    priority: str
    status: str
    due_date: datetime | None = None
    estimated_minutes: int | None = None
    tags: list[Any] | None = None
    completed_at: datetime | None = None
    created_at: datetime
    updated_at: datetime
