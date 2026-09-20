from abc import ABC, abstractmethod
from collections.abc import AsyncIterator
from enum import StrEnum
from typing import Any

from pydantic import BaseModel, Field


class AIRole(StrEnum):
    SYSTEM = "system"
    USER = "user"
    ASSISTANT = "assistant"
    TOOL = "tool"


class AIMessage(BaseModel):
    role: AIRole
    content: str
    name: str | None = None
    tool_call_id: str | None = None


class AIToolCall(BaseModel):
    id: str
    name: str
    arguments: dict[str, Any] = Field(default_factory=dict)


class AIToolResult(BaseModel):
    tool_call_id: str
    name: str
    content: str
    is_error: bool = False


class AIUsage(BaseModel):
    prompt_tokens: int = 0
    completion_tokens: int = 0
    total_tokens: int = 0


class AIRequest(BaseModel):
    messages: list[AIMessage]
    system_instruction: str | None = None
    temperature: float = 0.7
    max_tokens: int | None = None
    tools: list[dict[str, Any]] | None = None


class AIResponse(BaseModel):
    content: str
    tool_calls: list[AIToolCall] | None = None
    usage: AIUsage | None = None
    finish_reason: str | None = None


class AIStreamChunk(BaseModel):
    delta: str
    tool_calls: list[AIToolCall] | None = None
    is_final: bool = False
    usage: AIUsage | None = None


class AIProvider(ABC):
    """
    Provider-independent AI Interface.
    Enforces that business logic and tools never directly couple to external AI SDKs.
    """

    @property
    @abstractmethod
    def provider_name(self) -> str:
        """Name of the provider (e.g., 'gemini', 'ollama')."""

    @abstractmethod
    async def generate(self, request: AIRequest) -> AIResponse:
        """Generate a complete text response."""

    @abstractmethod
    async def stream(self, request: AIRequest) -> AsyncIterator[AIStreamChunk]:
        """Stream response chunks asynchronously."""

    @abstractmethod
    async def embed(self, texts: list[str]) -> list[list[float]]:
        """Generate vector embeddings for input texts."""
