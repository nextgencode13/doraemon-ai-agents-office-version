from collections.abc import AsyncIterator

import pytest
from httpx import ASGITransport, AsyncClient

from app.ai.base import (
    AIProvider,
    AIRequest,
    AIResponse,
    AIStreamChunk,
    AIUsage,
)
from app.ai.service import ai_service
from app.db.session import Base, engine
from app.main import app


class MockChatProvider(AIProvider):
    @property
    def provider_name(self) -> str:
        return "mock_chat"

    async def generate(self, request: AIRequest) -> AIResponse:
        last_msg = request.messages[-1].content
        return AIResponse(
            content=f"Doraemon Response to: {last_msg}",
            usage=AIUsage(prompt_tokens=10, completion_tokens=15, total_tokens=25),
        )

    async def stream(self, request: AIRequest) -> AsyncIterator[AIStreamChunk]:
        yield AIStreamChunk(delta="Doraemon ")
        yield AIStreamChunk(delta="Streaming ")
        yield AIStreamChunk(delta=f"Response: {request.messages[-1].content}")
        yield AIStreamChunk(delta="", is_final=True)

    async def embed(self, texts: list[str]) -> list[list[float]]:
        return [[0.1, 0.2] for _ in texts]


@pytest.fixture(autouse=True)
async def setup_db_and_mock_provider():
    # Setup test DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    # Use mock provider for tests
    original_provider = ai_service.provider
    ai_service.set_provider(MockChatProvider())

    yield

    ai_service.set_provider(original_provider)


@pytest.mark.asyncio
async def test_chat_sync_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Send chat message
        response = await client.post(
            "/api/v1/chat",
            json={"message": "What is my next task?"},
        )
        assert response.status_code == 200
        data = response.json()
        assert "conversation_id" in data
        assert data["user_message"]["content"] == "What is my next task?"
        assert data["assistant_message"]["content"] == "Doraemon Response to: What is my next task?"

        conv_id = data["conversation_id"]

        # 2. Verify conversation list contains it
        list_resp = await client.get("/api/v1/conversations")
        assert list_resp.status_code == 200
        convs = list_resp.json()
        assert any(c["id"] == conv_id for c in convs)

        # 3. Retrieve conversation history
        conv_resp = await client.get(f"/api/v1/conversations/{conv_id}")
        assert conv_resp.status_code == 200
        conv_data = conv_resp.json()
        assert len(conv_data["messages"]) == 2


@pytest.mark.asyncio
async def test_chat_stream_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.post(
            "/api/v1/chat/stream",
            json={"message": "Hello Jarvis Stream"},
        )
        assert response.status_code == 200
        assert "text/event-stream" in response.headers.get("content-type", "")
        content = response.text
        assert "event: conversation" in content
        assert "event: token" in content
        assert "Doraemon " in content
        assert "event: done" in content
