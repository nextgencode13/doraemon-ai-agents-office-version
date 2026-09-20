from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.productivity import FocusSession
from app.models.task import Task, TaskPriority, TaskStatus
from app.repositories.productivity_repository import ProductivityRepository
from app.schemas.productivity import DailySummaryResponse, NextActionResponse


class ProductivityService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = ProductivityRepository(db)

    async def evaluate_next_action(self) -> NextActionResponse:
        """
        Calculates the single most impactful next action from current tasks, priorities,
        and deadlines, providing clear rationale.
        """
        result = await self.db.execute(
            select(Task).where(
                Task.status.in_([TaskStatus.TODO.value, TaskStatus.IN_PROGRESS.value])
            )
        )
        active_tasks = list(result.scalars().all())

        if not active_tasks:
            return NextActionResponse(
                task_id=None,
                task_title="Plan your upcoming objectives",
                priority="low",
                estimated_minutes=15,
                reason=(
                    "All tasks are completed! Taking a short planning pause keeps "
                    "your momentum strong."
                ),
                suggested_action="Create your top 3 priority tasks for today using JARVIS.",
            )

        # Score active tasks
        def score_task(task: Task) -> tuple[int, str]:
            score = 0
            reasons = []

            # Priority Weight
            if task.priority == TaskPriority.CRITICAL.value:
                score += 100
                reasons.append("Critical priority item")
            elif task.priority == TaskPriority.HIGH.value:
                score += 75
                reasons.append("High priority item")
            elif task.priority == TaskPriority.MEDIUM.value:
                score += 50
            else:
                score += 25

            # In Progress Momentum
            if task.status == TaskStatus.IN_PROGRESS.value:
                score += 20
                reasons.append("Already in progress (finish current flow)")

            # Due date urgency
            if task.due_date:
                now = datetime.now(UTC)
                if task.due_date <= now:
                    score += 35
                    reasons.append("Due today or overdue")
                elif (task.due_date - now).total_seconds() < 86400:
                    score += 25
                    reasons.append("Due within 24 hours")

            # Quick win bonus
            if task.estimated_minutes and task.estimated_minutes <= 25:
                score += 10
                reasons.append("Quick win (≤25 mins)")

            reason_str = "; ".join(reasons) if reasons else "Top ranked task in your backlog"
            return score, reason_str

        scored_tasks = []
        for t in active_tasks:
            s, r = score_task(t)
            scored_tasks.append((t, s, r))

        scored_tasks.sort(key=lambda x: x[1], reverse=True)
        top_task, top_score, top_reason = scored_tasks[0]
        mins = top_task.estimated_minutes or 25

        return NextActionResponse(
            task_id=top_task.id,
            task_title=top_task.title,
            priority=top_task.priority,
            estimated_minutes=top_task.estimated_minutes or 30,
            reason=top_reason,
            suggested_action=f"Launch a {mins}-minute focus session on '{top_task.title}'.",
        )

    async def start_focus_session(
        self,
        duration_minutes: int = 25,
        task_id: str | None = None,
        notes: str | None = None,
    ) -> FocusSession:
        return await self.repo.create_focus_session(
            duration_minutes=duration_minutes,
            task_id=task_id,
            notes=notes,
        )

    async def end_focus_session(
        self,
        notes: str | None = None,
        status: str = "completed",
    ) -> FocusSession | None:
        return await self.repo.end_focus_session(notes=notes, status=status)

    async def get_active_session(self) -> FocusSession | None:
        return await self.repo.get_active_focus_session()

    async def get_daily_summary(self) -> DailySummaryResponse:
        stats = await self.repo.get_daily_stats()
        next_action = await self.evaluate_next_action()

        completed = stats["completed_tasks_count"]
        active = stats["active_tasks_count"]
        focus_mins = stats["total_focus_minutes"]

        # Productivity Score (0-100)
        task_ratio = (completed / max(1, completed + active)) * 50
        focus_ratio = min(50, (focus_mins / 120) * 50)
        prod_score = int(min(100, task_ratio + focus_ratio))

        return DailySummaryResponse(
            date=stats["date"],
            completed_tasks_count=completed,
            active_tasks_count=active,
            total_focus_minutes=focus_mins,
            next_priority_task=next_action.task_title if next_action.task_id else None,
            productivity_score=prod_score,
        )
