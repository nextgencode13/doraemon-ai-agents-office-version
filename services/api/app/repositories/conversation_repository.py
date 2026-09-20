
from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.conversation import Conversation, Message


class ConversationRepository:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_conversation(self, title: str = "New Conversation") -> Conversation:
        conversation = Conversation(title=title)
        self.session.add(conversation)
        await self.session.flush()
        await self.session.refresh(conversation)
        return conversation

    async def get_conversation(self, conversation_id: str) -> Conversation | None:
        query = (
            select(Conversation)
            .where(Conversation.id == conversation_id)
            .options(selectinload(Conversation.messages))
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_conversations(self, limit: int = 50, offset: int = 0) -> list[Conversation]:
        query = (
            select(Conversation)
            .options(selectinload(Conversation.messages))
            .order_by(desc(Conversation.updated_at))
            .limit(limit)
            .offset(offset)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def update_conversation_title(
        self, conversation_id: str, title: str
    ) -> Conversation | None:
        conversation = await self.get_conversation(conversation_id)
        if conversation:
            conversation.title = title
            await self.session.flush()
            await self.session.refresh(conversation)
        return conversation

    async def delete_conversation(self, conversation_id: str) -> bool:
        conversation = await self.get_conversation(conversation_id)
        if conversation:
            await self.session.delete(conversation)
            await self.session.flush()
            return True
        return False

    async def add_message(
        self,
        conversation_id: str,
        role: str,
        content: str,
        meta_info: dict | None = None,
    ) -> Message:
        message = Message(
            conversation_id=conversation_id,
            role=role,
            content=content,
            meta_info=meta_info or {},
        )
        self.session.add(message)
        await self.session.flush()
        await self.session.refresh(message)
        return message

    async def get_messages(self, conversation_id: str) -> list[Message]:
        query = (
            select(Message)
            .where(Message.conversation_id == conversation_id)
            .order_by(Message.created_at)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
