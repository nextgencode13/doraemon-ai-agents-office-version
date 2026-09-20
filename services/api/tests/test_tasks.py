import pytest
from httpx import ASGITransport, AsyncClient

from app.db.session import Base, engine
from app.main import app
from app.tools.base import tool_registry
from app.tools.task_tools import register_task_tools


@pytest.fixture(autouse=True)
async def setup_db():
    register_task_tools()
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    yield


@pytest.mark.asyncio
async def test_task_crud_flow():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Create Task
        res = await client.post(
            "/api/v1/tasks",
            json={
                "title": "Review Office Workflow Plan",
                "description": "Evaluate automated agent tasks",
                "priority": "high",
                "estimated_minutes": 45,
                "tags": ["office", "planning"],
            },
        )
        assert res.status_code == 201
        data = res.json()
        assert data["title"] == "Review Office Workflow Plan"
        assert data["priority"] == "high"
        assert data["status"] == "todo"
        task_id = data["id"]

        # 2. Get Task by ID
        get_res = await client.get(f"/api/v1/tasks/{task_id}")
        assert get_res.status_code == 200
        assert get_res.json()["id"] == task_id

        # 3. List Tasks
        list_res = await client.get("/api/v1/tasks?priority=high")
        assert list_res.status_code == 200
        tasks = list_res.json()
        assert any(t["id"] == task_id for t in tasks)

        # 4. Complete Task
        comp_res = await client.post(f"/api/v1/tasks/{task_id}/complete")
        assert comp_res.status_code == 200
        assert comp_res.json()["status"] == "done"
        assert comp_res.json()["completed_at"] is not None

        # 5. Delete Task
        del_res = await client.delete(f"/api/v1/tasks/{task_id}")
        assert del_res.status_code == 204


@pytest.mark.asyncio
async def test_task_tool_registry():
    create_tool = tool_registry.get_tool("create_task")
    assert create_tool is not None

    result = await tool_registry.execute_tool(
        "create_task",
        {"title": "Tool Executed Task", "priority": "critical"},
    )
    assert result.success is True
    assert result.output["title"] == "Tool Executed Task"
    assert result.output["priority"] == "critical"

    list_tool = tool_registry.get_tool("list_tasks")
    assert list_tool is not None
    list_res = await tool_registry.execute_tool("list_tasks", {})
    assert list_res.success is True
    assert isinstance(list_res.output, list)
