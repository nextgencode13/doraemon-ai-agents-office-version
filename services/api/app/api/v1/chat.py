import json
from collections.abc import AsyncIterator

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.base import AIMessage, AIRole
from app.ai.service import ai_service
from app.db.session import get_db
from app.repositories.conversation_repository import ConversationRepository
from app.schemas.chat import (
    ChatRequest,
    ChatResponse,
    ConversationRead,
    MessageRead,
)

router = APIRouter(tags=["Chat & Conversations"])


@router.get("/conversations", response_model=list[ConversationRead])
async def list_conversations(
    limit: int = 50,
    offset: int = 0,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve list of recent conversations."""
    repo = ConversationRepository(db)
    return await repo.list_conversations(limit=limit, offset=offset)


@router.get("/conversations/{conversation_id}", response_model=ConversationRead)
async def get_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Retrieve a single conversation with its message history."""
    repo = ConversationRepository(db)
    conv = await repo.get_conversation(conversation_id)
    if not conv:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found",
        )
    return conv


@router.delete("/conversations/{conversation_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_conversation(
    conversation_id: str,
    db: AsyncSession = Depends(get_db),
):
    """Delete a conversation and its messages."""
    repo = ConversationRepository(db)
    deleted = await repo.delete_conversation(conversation_id)
    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Conversation '{conversation_id}' not found",
        )


@router.post("/chat", response_model=ChatResponse)
async def chat_sync(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Synchronous chat endpoint that persists conversation history and returns full response."""
    repo = ConversationRepository(db)

    # 1. Get or create conversation
    if payload.conversation_id:
        conversation = await repo.get_conversation(payload.conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
    else:
        title = payload.message[:40] + ("..." if len(payload.message) > 40 else "")
        conversation = await repo.create_conversation(title=title)

    # 2. Add user message
    user_msg = await repo.add_message(
        conversation_id=conversation.id,
        role="user",
        content=payload.message,
    )

    # 3. Build message history for AI
    db_messages = await repo.get_messages(conversation.id)
    ai_messages = [
        AIMessage(
            role=AIRole(m.role) if m.role in [r.value for r in AIRole] else AIRole.USER,
            content=m.content,
        )
        for m in db_messages
    ]

    # 4. Generate AI response
    try:
        ai_resp = await ai_service.generate_response(
            messages=ai_messages,
            temperature=payload.temperature or 0.7,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI Provider error: {exc}",
        ) from exc

    # 5. Persist assistant message
    meta_info = {}
    if ai_resp.usage:
        meta_info["usage"] = ai_resp.usage.model_dump()

    assistant_msg = await repo.add_message(
        conversation_id=conversation.id,
        role="assistant",
        content=ai_resp.content,
        meta_info=meta_info,
    )

    return ChatResponse(
        conversation_id=conversation.id,
        user_message=MessageRead.model_validate(user_msg),
        assistant_message=MessageRead.model_validate(assistant_msg),
    )


@router.post("/chat/stream")
async def chat_stream(
    payload: ChatRequest,
    db: AsyncSession = Depends(get_db),
):
    """Server-Sent Events (SSE) streaming chat endpoint."""
    repo = ConversationRepository(db)

    # 1. Get or create conversation
    if payload.conversation_id:
        conversation = await repo.get_conversation(payload.conversation_id)
        if not conversation:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Conversation not found",
            )
    else:
        title = payload.message[:40] + ("..." if len(payload.message) > 40 else "")
        conversation = await repo.create_conversation(title=title)

    # 2. Add user message
    await repo.add_message(
        conversation_id=conversation.id,
        role="user",
        content=payload.message,
    )

    # 3. Retrieve history
    db_messages = await repo.get_messages(conversation.id)
    ai_messages = [
        AIMessage(
            role=AIRole(m.role) if m.role in [r.value for r in AIRole] else AIRole.USER,
            content=m.content,
        )
        for m in db_messages
    ]

    async def event_generator() -> AsyncIterator[str]:
        # Initial event giving conversation_id
        yield f"event: conversation\ndata: {json.dumps({'conversation_id': conversation.id})}\n\n"

        accumulated_text = []
        try:
            async for chunk in ai_service.stream_response(
                messages=ai_messages,
                temperature=payload.temperature or 0.7,
            ):
                if chunk.delta:
                    accumulated_text.append(chunk.delta)
                    data = json.dumps({"delta": chunk.delta})
                    yield f"event: token\ndata: {data}\n\n"

            # Save full assistant message at end of stream
            full_content = "".join(accumulated_text)
            await repo.add_message(
                conversation_id=conversation.id,
                role="assistant",
                content=full_content,
            )
            await db.commit()

            done_data = json.dumps({"status": "complete", "conversation_id": conversation.id})
            yield f"event: done\ndata: {done_data}\n\n"
        except Exception as exc:
            yield f"event: error\ndata: {json.dumps({'error': str(exc)})}\n\n"

    return StreamingResponse(event_generator(), media_type="text/event-stream")
