import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import Base, engine
from app.main import app
from app.repositories.memory_repository import cosine_similarity
from app.tools.base import tool_registry
from app.tools.memory_tools import register_memory_tools


@pytest.fixture(autouse=True)
async def setup_db():
    register_memory_tools()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


def test_cosine_similarity_calculation():
    v1 = [1.0, 0.0, 0.0]
    v2 = [1.0, 0.0, 0.0]
    assert round(cosine_similarity(v1, v2), 4) == 1.0

    v3 = [0.0, 1.0, 0.0]
    assert round(cosine_similarity(v1, v3), 4) == 0.0

    v4 = [0.7071, 0.7071, 0.0]
    assert round(cosine_similarity(v1, v4), 2) == 0.71


@pytest.mark.asyncio
async def test_memory_crud_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Memory
        res = await client.post(
            "/api/v1/memory",
            json={
                "content": "Deployment access requires approval from DevOps lead (Sarah).",
                "category": "work",
                "tags": ["deployment", "devops", "security"],
                "source": "user",
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["category"] == "work"
        assert "DevOps lead" in data["content"]
        memory_id = data["id"]

        # 2. List Memories
        list_res = await client.get("/api/v1/memory?category=work")
        assert list_res.status_code == 200
        items = list_res.json()
        assert any(m["id"] == memory_id for m in items)

        # 3. Search Memory (Keyword match fallback in test environment)
        search_res = await client.get("/api/v1/memory/search?q=DevOps+approval")
        assert search_res.status_code == 200
        results = search_res.json()
        assert len(results) > 0
        assert results[0]["id"] == memory_id

        # 4. Delete Memory
        del_res = await client.delete(f"/api/v1/memory/{memory_id}")
        assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_memory_tools_execution():
    # Remember tool
    rem_res = await tool_registry.execute_tool(
        "remember",
        {
            "content": "User prefers dark mode UI and concise bullet point summaries.",
            "category": "preference",
            "tags": ["ui", "preferences"],
        },
    )
    assert rem_res.success is True
    assert rem_res.output["category"] == "preference"
    memory_id = rem_res.output["memory_id"]

    # Search Memory tool
    search_res = await tool_registry.execute_tool(
        "search_memory",
        {"query": "dark mode UI preferences"},
    )
    assert search_res.success is True
    assert isinstance(search_res.output, list)
    assert len(search_res.output) > 0

    # Delete Memory tool
    del_res = await tool_registry.execute_tool(
        "delete_memory",
        {"memory_id": memory_id},
    )
    assert del_res.success is True
    assert del_res.output["deleted"] is True
