from datetime import UTC, datetime

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.productivity import FocusSession, FocusSessionStatus
from app.models.task import Task, TaskStatus


class ProductivityRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_focus_session(
        self,
        duration_minutes: int = 25,
        task_id: str | None = None,
        notes: str | None = None,
    ) -> FocusSession:
        # Mark any existing active sessions as cancelled before starting a new one
        await self.db.execute(
            update(FocusSession)
            .where(FocusSession.status == FocusSessionStatus.ACTIVE.value)
            .values(status=FocusSessionStatus.CANCELLED.value, ended_at=datetime.now(UTC))
        )
        session = FocusSession(
            duration_minutes=duration_minutes,
            task_id=task_id,
            notes=notes,
            status=FocusSessionStatus.ACTIVE.value,
            started_at=datetime.now(UTC),
        )
        self.db.add(session)
        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_active_focus_session(self) -> FocusSession | None:
        result = await self.db.execute(
            select(FocusSession)
            .where(FocusSession.status == FocusSessionStatus.ACTIVE.value)
            .order_by(FocusSession.started_at.desc())
        )
        return result.scalars().first()

    async def end_focus_session(
        self,
        session_id: str | None = None,
        status: str = FocusSessionStatus.COMPLETED.value,
        notes: str | None = None,
    ) -> FocusSession | None:
        if session_id:
            query = select(FocusSession).where(FocusSession.id == session_id)
        else:
            query = select(FocusSession).where(
                FocusSession.status == FocusSessionStatus.ACTIVE.value
            )

        result = await self.db.execute(query)
        session = result.scalars().first()
        if not session:
            return None

        session.status = status
        session.ended_at = datetime.now(UTC)
        if notes:
            session.notes = (session.notes or "") + f" | Wrap-up: {notes}"

        await self.db.commit()
        await self.db.refresh(session)
        return session

    async def get_daily_stats(self) -> dict:
        today_start = datetime.now(UTC).replace(hour=0, minute=0, second=0, microsecond=0)

        # Count completed tasks today
        res_completed = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.status == TaskStatus.DONE.value,
                Task.completed_at >= today_start,
            )
        )
        completed_count = res_completed.scalar() or 0

        # Count active tasks
        res_active = await self.db.execute(
            select(func.count(Task.id)).where(
                Task.status.in_([TaskStatus.TODO.value, TaskStatus.IN_PROGRESS.value])
            )
        )
        active_count = res_active.scalar() or 0

        # Total completed focus minutes today
        res_focus = await self.db.execute(
            select(func.sum(FocusSession.duration_minutes)).where(
                FocusSession.status == FocusSessionStatus.COMPLETED.value,
                FocusSession.started_at >= today_start,
            )
        )
        total_focus = res_focus.scalar() or 0

        return {
            "date": today_start.strftime("%Y-%m-%d"),
            "completed_tasks_count": completed_count,
            "active_tasks_count": active_count,
            "total_focus_minutes": int(total_focus),
        }
