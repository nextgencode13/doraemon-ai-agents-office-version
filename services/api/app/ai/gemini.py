from collections.abc import AsyncIterator

from google import genai
from google.genai import types

from app.ai.base import (
    AIMessage,
    AIProvider,
    AIRequest,
    AIResponse,
    AIRole,
    AIStreamChunk,
    AIUsage,
)
from app.core.config import settings
from app.core.logging import logger


class GeminiProvider(AIProvider):
    """
    Official Google Gemini API implementation using the google-genai SDK.
    Strictly isolated from application business logic.
    """

    def __init__(self, api_key: str | None = None, model: str | None = None):
        self.api_key = api_key or settings.GEMINI_API_KEY
        self.model = model or settings.GEMINI_MODEL
        self.embedding_model = settings.GEMINI_EMBEDDING_MODEL
        self._client: genai.Client | None = None

    @property
    def provider_name(self) -> str:
        return "gemini"

    def _get_client(self) -> genai.Client:
        if not self.api_key:
            raise ValueError(
                "GEMINI_API_KEY is not configured. Set it in backend .env to enable Gemini AI."
            )
        if self._client is None:
            self._client = genai.Client(api_key=self.api_key)
        return self._client

    def _build_contents(self, messages: list[AIMessage]) -> list[types.Content]:
        contents: list[types.Content] = []
        for msg in messages:
            # Map AIRole to Gemini role
            role = "user" if msg.role in (AIRole.USER, AIRole.SYSTEM) else "model"
            part = types.Part.from_text(text=msg.content)
            contents.append(types.Content(role=role, parts=[part]))
        return contents

    def _build_config(self, request: AIRequest) -> types.GenerateContentConfig:
        config_args: dict = {}
        if request.system_instruction:
            config_args["system_instruction"] = request.system_instruction
        if request.temperature is not None:
            config_args["temperature"] = request.temperature
        if request.max_tokens is not None:
            config_args["max_output_tokens"] = request.max_tokens

        return types.GenerateContentConfig(**config_args)

    async def generate(self, request: AIRequest) -> AIResponse:
        client = self._get_client()
        contents = self._build_contents(request.messages)
        config = self._build_config(request)

        try:
            response = await client.aio.models.generate_content(
                model=self.model,
                contents=contents,
                config=config,
            )

            text_content = response.text or ""
            usage = None
            if response.usage_metadata:
                usage = AIUsage(
                    prompt_tokens=response.usage_metadata.prompt_token_count or 0,
                    completion_tokens=response.usage_metadata.candidates_token_count or 0,
                    total_tokens=response.usage_metadata.total_token_count or 0,
                )

            return AIResponse(
                content=text_content,
                usage=usage,
            )
        except Exception as exc:
            logger.exception("Error in Gemini generate")
            raise RuntimeError(f"Gemini API generation error: {exc}") from exc

    async def stream(self, request: AIRequest) -> AsyncIterator[AIStreamChunk]:
        client = self._get_client()
        contents = self._build_contents(request.messages)
        config = self._build_config(request)

        try:
            stream_response = await client.aio.models.generate_content_stream(
                model=self.model,
                contents=contents,
                config=config,
            )

            async for chunk in stream_response:
                chunk_text = chunk.text or ""
                yield AIStreamChunk(delta=chunk_text)

            yield AIStreamChunk(delta="", is_final=True)
        except Exception as exc:
            logger.exception("Error in Gemini stream")
            raise RuntimeError(f"Gemini API stream error: {exc}") from exc

    async def embed(self, texts: list[str]) -> list[list[float]]:
        client = self._get_client()
        try:
            result = await client.aio.models.embed_content(
                model=self.embedding_model,
                contents=texts,
            )
            return [e.values for e in result.embeddings]
        except Exception as exc:
            logger.exception("Error in Gemini embed")
            raise RuntimeError(f"Gemini embedding error: {exc}") from exc
