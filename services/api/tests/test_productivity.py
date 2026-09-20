import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import Base, engine
from app.main import app
from app.tools.base import tool_registry
from app.tools.productivity_tools import register_productivity_tools
from app.tools.task_tools import register_task_tools


@pytest.fixture(autouse=True)
async def setup_db():
    register_task_tools()
    register_productivity_tools()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_next_action_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create tasks with different priorities
        await client.post(
            "/api/v1/tasks",
            json={
                "title": "Low priority task",
                "priority": "low",
                "estimated_minutes": 60,
            },
        )
        crit_res = await client.post(
            "/api/v1/tasks",
            json={
                "title": "Fix Critical Security Issue",
                "priority": "critical",
                "estimated_minutes": 25,
            },
        )
        crit_id = crit_res.json()["id"]

        # 2. Get Next Action
        action_res = await client.get("/api/v1/productivity/next-action")
        assert action_res.status_code == 200
        data = action_res.json()
        assert data["task_id"] == crit_id
        assert data["priority"] == "critical"
        assert "Critical" in data["reason"] or "Quick win" in data["reason"]


@pytest.mark.asyncio
async def test_focus_session_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Start Focus Session
        start_res = await client.post(
            "/api/v1/productivity/focus/start",
            json={
                "duration_minutes": 25,
                "notes": "Deep focus on API endpoint architecture",
            },
        )
        assert start_res.status_code == 201
        session_data = start_res.json()
        assert session_data["status"] == "active"
        assert session_data["duration_minutes"] == 25

        # 2. Get Active Focus Session
        active_res = await client.get("/api/v1/productivity/focus/active")
        assert active_res.status_code == 200
        assert active_res.json()["id"] == session_data["id"]

        # 3. End Focus Session
        end_res = await client.post(
            "/api/v1/productivity/focus/end",
            json={
                "notes": "Completed memory router and productivity endpoints.",
                "status": "completed",
            },
        )
        assert end_res.status_code == 200
        assert end_res.json()["status"] == "completed"
        assert end_res.json()["ended_at"] is not None


@pytest.mark.asyncio
async def test_daily_summary_and_tools():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Summary Endpoint
        sum_res = await client.get("/api/v1/productivity/summary")
        assert sum_res.status_code == 200
        data = sum_res.json()
        assert "date" in data
        assert "productivity_score" in data

    # 2. Tool Execution
    next_tool_res = await tool_registry.execute_tool("get_next_action", {})
    assert next_tool_res.success is True
    assert "task_title" in next_tool_res.output

    start_tool_res = await tool_registry.execute_tool(
        "start_focus_session",
        {"duration_minutes": 15, "notes": "Writing tests"},
    )
    assert start_tool_res.success is True
    assert start_tool_res.output["status"] == "active"

    end_tool_res = await tool_registry.execute_tool(
        "end_focus_session",
        {"notes": "Tests pass", "status": "completed"},
    )
    assert end_tool_res.success is True
