from collections.abc import AsyncIterator

from app.ai.base import (
    AIMessage,
    AIProvider,
    AIRequest,
    AIResponse,
    AIStreamChunk,
)
from app.ai.gemini import GeminiProvider
from app.core.config import settings
from app.core.logging import logger

JARVIS_SYSTEM_INSTRUCTION = """You are JARVIS, a personal AI operating system for Windows.
You are calm, intelligent, concise, highly capable, and action-oriented.
You help the user plan their day, organize tasks, recall information,
prioritize decisions, and execute actions on their computer.

Guidelines:
- Keep answers direct and helpful. Avoid robotic fluff or excessive enthusiasm.
- When asked "What should I do now?", provide one strong recommendation with a short, clear reason.
- Be honest about limitations or missing permissions.
- Format responses cleanly using GitHub-flavored Markdown.
"""


class AIService:
    """
    Central AI orchestration service.
    Translates application requests into provider calls.
    """

    def __init__(self, provider: AIProvider | None = None):
        if provider:
            self._provider = provider
        elif settings.AI_PROVIDER == "gemini":
            self._provider = GeminiProvider()
        else:
            # Fallback or future Ollama provider
            self._provider = GeminiProvider()

    @property
    def provider(self) -> AIProvider:
        return self._provider

    def set_provider(self, provider: AIProvider):
        """Allows dynamic switching of provider (e.g. during tests or Ollama activation)."""
        self._provider = provider

    async def generate_response(
        self,
        messages: list[AIMessage],
        system_instruction: str | None = None,
        temperature: float = 0.7,
    ) -> AIResponse:
        request = AIRequest(
            messages=messages,
            system_instruction=system_instruction or JARVIS_SYSTEM_INSTRUCTION,
            temperature=temperature,
        )
        logger.info(
            f"Generating AI response via {self._provider.provider_name}",
            extra={"operation": "ai_generate", "message_count": len(messages)},
        )
        return await self._provider.generate(request)

    async def stream_response(
        self,
        messages: list[AIMessage],
        system_instruction: str | None = None,
        temperature: float = 0.7,
    ) -> AsyncIterator[AIStreamChunk]:
        request = AIRequest(
            messages=messages,
            system_instruction=system_instruction or JARVIS_SYSTEM_INSTRUCTION,
            temperature=temperature,
        )
        logger.info(
            f"Streaming AI response via {self._provider.provider_name}",
            extra={"operation": "ai_stream", "message_count": len(messages)},
        )
        async for chunk in self._provider.stream(request):
            yield chunk


ai_service = AIService()
