from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.memory.service import MemoryService
from app.repositories.memory_repository import MemoryRepository
from app.schemas.memory import MemoryCreate, MemoryRead, MemorySearchResult

router = APIRouter(prefix="/memory", tags=["Memory"])


@router.post("", response_model=MemoryRead, status_code=status.HTTP_201_CREATED)
async def create_memory(
    payload: MemoryCreate,
    db: AsyncSession = Depends(get_db),
):
    """Store a new piece of information or preference in memory with vector embeddings."""
    service = MemoryService(db)
    memory = await service.remember(
        content=payload.content,
        category=payload.category,
        tags=payload.tags,
        source=payload.source,
    )
    return memory


@router.get("", response_model=list[MemoryRead])
async def list_memories(
    category: str | None = Query(None, description="Filter by category"),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    """List stored memories."""
    repo = MemoryRepository(db)
    return await repo.list_memories(category=category, limit=limit, offset=offset)


@router.get("/search", response_model=list[MemorySearchResult])
async def search_memories(
    q: str = Query(..., min_length=1, description="Search query"),
    category: str | None = Query(None, description="Optional category filter"),
    limit: int = Query(5, ge=1, le=20),
    threshold: float = Query(0.2, ge=0.0, le=1.0),
    db: AsyncSession = Depends(get_db),
):
    """Perform semantic vector + keyword search across stored memories."""
    service = MemoryService(db)
    return await service.search(
        query=q,
        category=category,
        limit=limit,
        threshold=threshold,
    )


@router.delete("/{memory_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_memory(
    memory_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a memory item."""
    repo = MemoryRepository(db)
    deleted = await repo.delete_memory(memory_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Memory '{memory_id}' not found",
        )
