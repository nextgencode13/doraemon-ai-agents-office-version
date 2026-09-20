from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field


class ChatMessagePayload(BaseModel):
    role: str = Field(..., description="Role: user, assistant, system, tool")
    content: str = Field(..., description="Text content of the message")


class ChatRequest(BaseModel):
    conversation_id: str | None = Field(
        None, description="Existing conversation UUID, or None to create a new one"
    )
    message: str = Field(..., min_length=1, description="User prompt message")
    temperature: float | None = Field(0.7, ge=0.0, le=2.0)


class MessageRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    conversation_id: str
    role: str
    content: str
    meta_info: dict[str, Any] | None = None
    created_at: datetime


class ConversationRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    title: str
    created_at: datetime
    updated_at: datetime
    messages: list[MessageRead] | None = None


class ChatResponse(BaseModel):
    conversation_id: str
    user_message: MessageRead
    assistant_message: MessageRead
