from abc import ABC, abstractmethod
from enum import StrEnum
from typing import Any

from pydantic import BaseModel


class ToolRiskLevel(StrEnum):
    SAFE = "safe"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ToolDefinition(BaseModel):
    name: str
    description: str
    parameters: dict[str, Any]
    risk_level: ToolRiskLevel = ToolRiskLevel.LOW
    requires_confirmation: bool = False


class ToolResult(BaseModel):
    tool_name: str
    success: bool
    output: Any
    error: str | None = None


class BaseTool(ABC):
    @property
    @abstractmethod
    def definition(self) -> ToolDefinition:
        pass

    @abstractmethod
    async def execute(self, **kwargs) -> ToolResult:
        pass


class ToolRegistry:
    def __init__(self):
        self._tools: dict[str, BaseTool] = {}

    def register(self, tool: BaseTool):
        self._tools[tool.definition.name] = tool

    def get_tool(self, name: str) -> BaseTool | None:
        return self._tools.get(name)

    def list_definitions(self) -> list[ToolDefinition]:
        return [t.definition for t in self._tools.values()]

    async def execute_tool(self, name: str, arguments: dict[str, Any]) -> ToolResult:
        tool = self.get_tool(name)
        if not tool:
            return ToolResult(
                tool_name=name,
                success=False,
                output=None,
                error=f"Tool '{name}' not found in registry",
            )
        try:
            return await tool.execute(**arguments)
        except Exception as exc:
            return ToolResult(
                tool_name=name,
                success=False,
                output=None,
                error=f"Error executing tool '{name}': {exc}",
            )


tool_registry = ToolRegistry()
