from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.productivity.service import ProductivityService
from app.schemas.productivity import (
    DailySummaryResponse,
    FocusSessionEnd,
    FocusSessionRead,
    FocusSessionStart,
    NextActionResponse,
)

router = APIRouter(prefix="/productivity", tags=["Productivity"])


@router.get("/next-action", response_model=NextActionResponse)
async def get_next_action(db: AsyncSession = Depends(get_db)):
    """Evaluate current backlog and return the single highest impact next action."""
    service = ProductivityService(db)
    return await service.evaluate_next_action()


@router.post("/focus/start", response_model=FocusSessionRead, status_code=status.HTTP_201_CREATED)
async def start_focus_session(
    payload: FocusSessionStart,
    db: AsyncSession = Depends(get_db),
):
    """Start a new focus session."""
    service = ProductivityService(db)
    return await service.start_focus_session(
        duration_minutes=payload.duration_minutes,
        task_id=payload.task_id,
        notes=payload.notes,
    )


@router.post("/focus/end", response_model=FocusSessionRead)
async def end_focus_session(
    payload: FocusSessionEnd,
    db: AsyncSession = Depends(get_db),
):
    """End the currently active focus session."""
    service = ProductivityService(db)
    session = await service.end_focus_session(notes=payload.notes, status=payload.status)
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="No active focus session found",
        )
    return session


@router.get("/focus/active", response_model=FocusSessionRead | None)
async def get_active_focus_session(db: AsyncSession = Depends(get_db)):
    """Get the currently active focus session, if any."""
    service = ProductivityService(db)
    return await service.get_active_session()


@router.get("/summary", response_model=DailySummaryResponse)
async def get_daily_summary(db: AsyncSession = Depends(get_db)):
    """Retrieve daily productivity metrics and accomplishments."""
    service = ProductivityService(db)
    return await service.get_daily_summary()
