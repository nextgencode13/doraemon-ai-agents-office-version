import math

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.memory import Memory


def cosine_similarity(v1: list[float], v2: list[float]) -> float:
    """Calculate cosine similarity between two vector embeddings."""
    if not v1 or not v2 or len(v1) != len(v2):
        return 0.0
    dot_product = sum(a * b for a, b in zip(v1, v2, strict=False))
    norm_v1 = math.sqrt(sum(a * a for a in v1))
    norm_v2 = math.sqrt(sum(b * b for b in v2))
    if norm_v1 == 0.0 or norm_v2 == 0.0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)


class MemoryRepository:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def create_memory(
        self,
        content: str,
        category: str = "general",
        tags: list[str] | None = None,
        embedding: list[float] | None = None,
        source: str = "user",
    ) -> Memory:
        memory = Memory(
            content=content,
            category=category,
            tags=tags or [],
            embedding=embedding,
            source=source,
        )
        self.db.add(memory)
        await self.db.commit()
        await self.db.refresh(memory)
        return memory

    async def get_memory(self, memory_id: str) -> Memory | None:
        result = await self.db.execute(select(Memory).where(Memory.id == memory_id))
        return result.scalars().first()

    async def list_memories(
        self,
        category: str | None = None,
        limit: int = 50,
        offset: int = 0,
    ) -> list[Memory]:
        query = select(Memory).order_by(Memory.created_at.desc())
        if category:
            query = query.where(Memory.category == category)
        query = query.limit(limit).offset(offset)
        result = await self.db.execute(query)
        return list(result.scalars().all())

    async def delete_memory(self, memory_id: str) -> bool:
        result = await self.db.execute(delete(Memory).where(Memory.id == memory_id))
        await self.db.commit()
        return (result.rowcount or 0) > 0

    async def search_similar(
        self,
        query_embedding: list[float] | None,
        query_text: str = "",
        category: str | None = None,
        limit: int = 5,
        threshold: float = 0.3,
    ) -> list[tuple[Memory, float]]:
        """
        Search memories by semantic cosine similarity, with text keyword match fallback.
        Returns list of (Memory, score) tuples sorted by highest score.
        """
        query = select(Memory)
        if category:
            query = query.where(Memory.category == category)
        result = await self.db.execute(query)
        all_memories = list(result.scalars().all())

        scored_results: list[tuple[Memory, float]] = []

        for mem in all_memories:
            score = 0.0
            if query_embedding and mem.embedding:
                score = cosine_similarity(query_embedding, mem.embedding)
            elif query_text:
                # Text keyword match fallback score
                lower_query = query_text.lower()
                lower_content = mem.content.lower()
                if lower_query in lower_content:
                    score = 0.9
                else:
                    words = [w for w in lower_query.split() if len(w) > 2]
                    if words:
                        matches = sum(1 for w in words if w in lower_content)
                        score = (matches / len(words)) * 0.8

            if score >= threshold:
                scored_results.append((mem, round(score, 4)))

        scored_results.sort(key=lambda x: x[1], reverse=True)
        return scored_results[:limit]
