from datetime import UTC, datetime

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.task import Task, TaskPriority, TaskStatus


class TaskRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_task(
        self,
        title: str,
        description: str | None = None,
        priority: str = TaskPriority.MEDIUM.value,
        status: str = TaskStatus.TODO.value,
        due_date: datetime | None = None,
        estimated_minutes: int | None = 30,
        tags: list[str] | None = None,
    ) -> Task:
        task = Task(
            title=title,
            description=description,
            priority=priority,
            status=status,
            due_date=due_date,
            estimated_minutes=estimated_minutes,
            tags=tags or [],
        )
        self.session.add(task)
        await self.session.flush()
        await self.session.refresh(task)
        return task

    async def get_task(self, task_id: str) -> Task | None:
        query = select(Task).where(Task.id == task_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_tasks(
        self,
        status: str | None = None,
        priority: str | None = None,
        tag: str | None = None,
        limit: int = 100,
        offset: int = 0,
    ) -> list[Task]:
        query = select(Task)
        if status:
            query = query.where(Task.status == status)
        if priority:
            query = query.where(Task.priority == priority)

        query = query.order_by(desc(Task.created_at)).limit(limit).offset(offset)
        result = await self.session.execute(query)
        tasks = list(result.scalars().all())

        if tag:
            tasks = [t for t in tasks if t.tags and tag in t.tags]
        return tasks

    async def update_task(
        self,
        task_id: str,
        title: str | None = None,
        description: str | None = None,
        priority: str | None = None,
        status: str | None = None,
        due_date: datetime | None = None,
        estimated_minutes: int | None = None,
        tags: list[str] | None = None,
    ) -> Task | None:
        task = await self.get_task(task_id)
        if not task:
            return None

        if title is not None:
            task.title = title
        if description is not None:
            task.description = description
        if priority is not None:
            task.priority = priority
        if status is not None:
            task.status = status
            if status == TaskStatus.DONE.value and not task.completed_at:
                task.completed_at = datetime.now(UTC)
            elif status != TaskStatus.DONE.value:
                task.completed_at = None
        if due_date is not None:
            task.due_date = due_date
        if estimated_minutes is not None:
            task.estimated_minutes = estimated_minutes
        if tags is not None:
            task.tags = tags

        await self.session.flush()
        await self.session.refresh(task)
        return task

    async def complete_task(self, task_id: str) -> Task | None:
        return await self.update_task(task_id, status=TaskStatus.DONE.value)

    async def delete_task(self, task_id: str) -> bool:
        task = await self.get_task(task_id)
        if task:
            await self.session.delete(task)
            await self.session.flush()
            return True
        return False
