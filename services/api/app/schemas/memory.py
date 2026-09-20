from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MemoryCreate(BaseModel):
    content: str = Field(..., min_length=1, description="Content of the memory to store")
    category: str = Field("general", description="Category: work, preference, fact, project, etc.")
    tags: list[str] = Field(default_factory=list, description="Tags for categorization")
    source: str = Field("user", description="Origin source of the memory")


class MemoryRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    content: str
    category: str
    tags: list[str] = Field(default_factory=list)
    source: str
    created_at: datetime
    updated_at: datetime


class MemorySearchResult(BaseModel):
    id: str
    content: str
    category: str
    tags: list[str] = Field(default_factory=list)
    source: str
    score: float
    created_at: datetime
