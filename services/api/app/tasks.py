
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.repositories.task_repository import TaskRepository
from app.schemas.task import TaskCreate, TaskRead, TaskUpdate

router = APIRouter(prefix="/tasks", tags=["Tasks"])


@router.get("", response_model=list[TaskRead])
async def list_tasks(
    status: str | None = Query(None),
    priority: str | None = Query(None),
    tag: str | None = Query(None),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
    db: AsyncSession = Depends(get_db),
):
    repo = TaskRepository(db)
    return await repo.list_tasks(
        status=status,
        priority=priority,
        tag=tag,
        limit=limit,
        offset=offset,
    )


@router.post("", response_model=TaskRead, status_code=status.HTTP_201_CREATED)
async def create_task(
    payload: TaskCreate,
    db: AsyncSession = Depends(get_db),
):
    repo = TaskRepository(db)
    return await repo.create_task(
        title=payload.title,
        description=payload.description,
        priority=payload.priority.value,
        status=payload.status.value,
        due_date=payload.due_date,
        estimated_minutes=payload.estimated_minutes,
        tags=payload.tags,
    )


@router.get("/{task_id}", response_model=TaskRead)
async def get_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = TaskRepository(db)
    task = await repo.get_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
    return task


@router.patch("/{task_id}", response_model=TaskRead)
async def update_task(
    task_id: str,
    payload: TaskUpdate,
    db: AsyncSession = Depends(get_db),
):
    repo = TaskRepository(db)
    task = await repo.update_task(
        task_id=task_id,
        title=payload.title,
        description=payload.description,
        priority=payload.priority.value if payload.priority else None,
        status=payload.status.value if payload.status else None,
        due_date=payload.due_date,
        estimated_minutes=payload.estimated_minutes,
        tags=payload.tags,
    )
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
    return task


@router.post("/{task_id}/complete", response_model=TaskRead)
async def complete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = TaskRepository(db)
    task = await repo.complete_task(task_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
    return task


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    db: AsyncSession = Depends(get_db),
):
    repo = TaskRepository(db)
    deleted = await repo.delete_task(task_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Task '{task_id}' not found",
        )
