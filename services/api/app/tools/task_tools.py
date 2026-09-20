from app.db.session import async_session_maker
from app.repositories.task_repository import TaskRepository
from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolRiskLevel, tool_registry


class CreateTaskTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="create_task",
            description="Create a new task with title, priority, and estimated duration.",
            risk_level=ToolRiskLevel.LOW,
            parameters={
                "type": "object",
                "properties": {
                    "title": {"type": "string", "description": "Title of the task"},
                    "description": {"type": "string", "description": "Detailed explanation"},
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                        "description": "Task priority level",
                    },
                    "estimated_minutes": {
                        "type": "integer",
                        "description": "Estimated minutes",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Tags",
                    },
                },
                "required": ["title"],
            },
        )

    async def execute(self, title: str, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            repo = TaskRepository(session)
            task = await repo.create_task(
                title=title,
                description=kwargs.get("description"),
                priority=kwargs.get("priority", "medium"),
                estimated_minutes=kwargs.get("estimated_minutes", 30),
                tags=kwargs.get("tags", []),
            )
            await session.commit()
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output={
                    "task_id": task.id,
                    "title": task.title,
                    "priority": task.priority,
                    "status": task.status,
                },
            )


class ListTasksTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="list_tasks",
            description="List tasks filtered by status and priority.",
            risk_level=ToolRiskLevel.SAFE,
            parameters={
                "type": "object",
                "properties": {
                    "status": {
                        "type": "string",
                        "enum": ["todo", "in_progress", "done", "cancelled"],
                        "description": "Filter by task status",
                    },
                    "priority": {
                        "type": "string",
                        "enum": ["low", "medium", "high", "critical"],
                        "description": "Filter by task priority",
                    },
                },
            },
        )

    async def execute(self, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            repo = TaskRepository(session)
            tasks = await repo.list_tasks(
                status=kwargs.get("status"),
                priority=kwargs.get("priority"),
            )
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output=[
                    {
                        "id": t.id,
                        "title": t.title,
                        "priority": t.priority,
                        "status": t.status,
                        "due_date": t.due_date.isoformat() if t.due_date else None,
                    }
                    for t in tasks
                ],
            )


class CompleteTaskTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="complete_task",
            description="Mark a task as completed by task ID.",
            risk_level=ToolRiskLevel.LOW,
            parameters={
                "type": "object",
                "properties": {
                    "task_id": {"type": "string", "description": "Task UUID to complete"},
                },
                "required": ["task_id"],
            },
        )

    async def execute(self, task_id: str, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            repo = TaskRepository(session)
            task = await repo.complete_task(task_id)
            if not task:
                return ToolResult(
                    tool_name=self.definition.name,
                    success=False,
                    output=None,
                    error=f"Task '{task_id}' not found",
                )
            await session.commit()
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output={"task_id": task.id, "title": task.title, "status": task.status},
            )


def register_task_tools():
    tool_registry.register(CreateTaskTool())
    tool_registry.register(ListTasksTool())
    tool_registry.register(CompleteTaskTool())
