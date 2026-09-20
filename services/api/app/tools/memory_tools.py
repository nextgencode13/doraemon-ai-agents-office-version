from app.db.session import async_session_maker
from app.memory.service import MemoryService
from app.repositories.memory_repository import MemoryRepository
from app.tools.base import BaseTool, ToolDefinition, ToolResult, ToolRiskLevel, tool_registry


class RememberTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="remember",
            description="Store and remember a fact, user preference, or note for future recall.",
            risk_level=ToolRiskLevel.LOW,
            parameters={
                "type": "object",
                "properties": {
                    "content": {
                        "type": "string",
                        "description": "The exact fact, instruction, or note to remember",
                    },
                    "category": {
                        "type": "string",
                        "enum": ["general", "work", "preference", "fact", "project", "system"],
                        "description": "Category for organizing this memory",
                    },
                    "tags": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "Optional keyword tags",
                    },
                },
                "required": ["content"],
            },
        )

    async def execute(self, content: str, category: str = "general", **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            service = MemoryService(session)
            memory = await service.remember(
                content=content,
                category=category,
                tags=kwargs.get("tags", []),
                source="tool",
            )
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output={
                    "memory_id": memory.id,
                    "content": memory.content,
                    "category": memory.category,
                    "status": "stored",
                },
            )


class SearchMemoryTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="search_memory",
            description="Perform semantic search over stored memories to recall context or facts.",
            risk_level=ToolRiskLevel.SAFE,
            parameters={
                "type": "object",
                "properties": {
                    "query": {
                        "type": "string",
                        "description": "Search query or question to find relevant memories",
                    },
                    "category": {
                        "type": "string",
                        "description": "Optional category filter",
                    },
                    "limit": {
                        "type": "integer",
                        "description": "Maximum number of memories to return (default 5)",
                    },
                },
                "required": ["query"],
            },
        )

    async def execute(self, query: str, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            service = MemoryService(session)
            results = await service.search(
                query=query,
                category=kwargs.get("category"),
                limit=kwargs.get("limit", 5),
            )
            return ToolResult(
                tool_name=self.definition.name,
                success=True,
                output=[
                    {
                        "id": r.id,
                        "content": r.content,
                        "category": r.category,
                        "score": r.score,
                    }
                    for r in results
                ],
            )


class DeleteMemoryTool(BaseTool):
    @property
    def definition(self) -> ToolDefinition:
        return ToolDefinition(
            name="delete_memory",
            description="Delete a specific stored memory by ID.",
            risk_level=ToolRiskLevel.MEDIUM,
            parameters={
                "type": "object",
                "properties": {
                    "memory_id": {
                        "type": "string",
                        "description": "The ID of the memory to delete",
                    },
                },
                "required": ["memory_id"],
            },
        )

    async def execute(self, memory_id: str, **kwargs) -> ToolResult:
        async with async_session_maker() as session:
            repo = MemoryRepository(session)
            deleted = await repo.delete_memory(memory_id)
            return ToolResult(
                tool_name=self.definition.name,
                success=deleted,
                output={"memory_id": memory_id, "deleted": deleted},
                error=None if deleted else f"Memory '{memory_id}' not found",
            )


def register_memory_tools():
    tool_registry.register(RememberTool())
    tool_registry.register(SearchMemoryTool())
    tool_registry.register(DeleteMemoryTool())
