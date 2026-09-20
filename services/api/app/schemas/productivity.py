from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class FocusSessionStart(BaseModel):
    duration_minutes: int = Field(25, ge=1, le=180, description="Session duration in minutes")
    task_id: str | None = Field(None, description="Optional task associated with session")
    notes: str | None = Field(None, description="Focus intent or objectives")


class FocusSessionEnd(BaseModel):
    notes: str | None = Field(None, description="Notes on accomplishments or wrap-up")
    status: str = Field("completed", description="Session end status: completed or cancelled")


class FocusSessionRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    task_id: str | None
    duration_minutes: int
    status: str
    started_at: datetime
    ended_at: datetime | None
    notes: str | None


class NextActionResponse(BaseModel):
    task_id: str | None = None
    task_title: str
    priority: str
    estimated_minutes: int = 30
    reason: str
    suggested_action: str


class DailySummaryResponse(BaseModel):
    date: str
    completed_tasks_count: int
    active_tasks_count: int
    total_focus_minutes: int
    next_priority_task: str | None
    productivity_score: int  # 0 to 100
