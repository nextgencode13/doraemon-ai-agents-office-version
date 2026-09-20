from collections.abc import AsyncIterator

import pytest

from app.ai.base import AIMessage, AIProvider, AIRequest, AIResponse, AIRole, AIStreamChunk, AIUsage


class MockProvider(AIProvider):
    @property
    def provider_name(self) -> str:
        return "mock"

    async def generate(self, request: AIRequest) -> AIResponse:
        return AIResponse(
            content=f"Echo: {request.messages[-1].content}",
            usage=AIUsage(prompt_tokens=10, completion_tokens=5, total_tokens=15),
        )

    async def stream(self, request: AIRequest) -> AsyncIterator[AIStreamChunk]:
        yield AIStreamChunk(delta="Echo: ")
        yield AIStreamChunk(delta=request.messages[-1].content, is_final=True)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.1, 0.2, 0.3] for _ in texts]


@pytest.mark.asyncio
async def test_mock_provider_implementation():
    provider = MockProvider()
    assert provider.provider_name == "mock"

    request = AIRequest(
        messages=[AIMessage(role=AIRole.USER, content="Hello JARVIS")]
    )

    response = await provider.generate(request)
    assert response.content == "Echo: Hello JARVIS"
    assert response.usage.total_tokens == 15

    stream_chunks = []
    async for chunk in provider.stream(request):
        stream_chunks.append(chunk.delta)
    assert "".join(stream_chunks) == "Echo: Hello JARVIS"

    embeddings = await provider.embed(["test text"])
    assert len(embeddings) == 1
    assert len(embeddings[0]) == 3
