from app.db.session import async_session_maker
from app.productivity.service import ProductivityService
from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolRiskLevel, tool_registry


class GetNextActionTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_next_action",
            description="Evaluate active tasks and deadlines to return the single best action.",
            risk_level=ToolRiskLevel.SAFE,
            parameters={
                "type": "object",
                "properties": {},
            },
        )

    async def execute(self, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            service = ProductivityService(session)
            action = await service.evaluate_next_action()
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output=action.model_dump(),
            )


class StartFocusSessionTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="start_focus_session",
            description="Start a focused work session with a set duration in minutes.",
            risk_level=ToolRiskLevel.LOW,
            parameters={
                "type": "object",
                "properties": {
                    "duration_minutes": {
                        "type": "integer",
                        "description": "Session length in minutes (default 25)",
                    },
                    "task_id": {
                        "type": "string",
                        "description": "Optional ID of the task to focus on",
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional notes on focus goal",
                    },
                },
            },
        )

    async def execute(self, duration_minutes: int = 25, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            service = ProductivityService(session)
            session_obj = await service.start_focus_session(
                duration_minutes=duration_minutes,
                task_id=kwargs.get("task_id"),
                notes=kwargs.get("notes"),
            )
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output={
                    "session_id": session_obj.id,
                    "duration_minutes": session_obj.duration_minutes,
                    "started_at": session_obj.started_at.isoformat(),
                    "status": session_obj.status,
                },
            )


class EndFocusSessionTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="end_focus_session",
            description="End the currently running focus session.",
            risk_level=ToolRiskLevel.LOW,
            parameters={
                "type": "object",
                "properties": {
                    "notes": {
                        "type": "string",
                        "description": "Summary of what was achieved during the focus session",
                    },
                    "status": {
                        "type": "string",
                        "enum": ["completed", "cancelled"],
                        "description": "How the session ended (default: completed)",
                    },
                },
            },
        )

    async def execute(
        self, notes: str | None = None, status: str = "completed", **kwargs
    ) -> ToolResult:
        async with async_session_maker() as session:
            service = ProductivityService(session)
            session_obj = await service.end_focus_session(notes=notes, status=status)
            if not session_obj:
                return ToolResult(
                    tool_name=self.definition.name,
                    success=False,
                    output=None,
                    error="No active focus session found to end",
                )
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output={
                    "session_id": session_obj.id,
                    "status": session_obj.status,
                    "ended_at": session_obj.ended_at.isoformat() if session_obj.ended_at else None,
                },
            )


class GetDailySummaryTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="get_daily_summary",
            description="Retrieve daily productivity statistics, task completions, and focus time.",
            risk_level=ToolRiskLevel.SAFE,
            parameters={"type": "object", "properties": {}},
        )

    async def execute(self, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            service = ProductivityService(session)
            summary = await service.get_daily_summary()
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output=summary.model_dump(),
            )


def register_productivity_tools():
    tool_registry.register(GetNextActionTool())
    tool_registry.register(StartFocusSessionTool())
    tool_registry.register(EndFocusSessionTool())
    tool_registry.register(GetDailySummaryTool())
