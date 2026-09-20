from sqlalchemy.ext.asyncio import AsyncSession

from app.ai.service import ai_service
from app.core.logging import logger
from app.models.memory import Memory
from app.repositories.memory_repository import MemoryRepository
from app.schemas.memory import MemorySearchResult


class MemoryService:
    def __init__(self, db: AsyncSession):
        self.db = db
        self.repo = MemoryRepository(db)

    async def _get_embedding(self, text: str) -> list[float] | None:
        """Generate embedding vector using current AIProvider."""
        try:
            embeddings = await ai_service.provider.embed([text])
            if embeddings and len(embeddings) > 0:
                return embeddings[0]
        except Exception as exc:
            logger.warning(f"Could not generate embedding for text (fallback enabled): {exc}")
        return None

    async def remember(
        self,
        content: str,
        category: str = "general",
        tags: list[str] | None = None,
        source: str = "user",
    ) -> Memory:
        """Store a new memory item with semantic embedding."""
        embedding = await self._get_embedding(content)
        memory = await self.repo.create_memory(
            content=content,
            category=category,
            tags=tags or [],
            embedding=embedding,
            source=source,
        )
        logger.info(
            f"Stored new memory (id: {memory.id})",
            extra={"operation": "memory_remember", "category": category},
        )
        return memory

    async def search(
        self,
        query: str,
        category: str | None = None,
        limit: int = 5,
        threshold: float = 0.25,
    ) -> list[MemorySearchResult]:
        """Perform semantic search over memory store."""
        query_embedding = await self._get_embedding(query)
        scored = await self.repo.search_similar(
            query_embedding=query_embedding,
            query_text=query,
            category=category,
            limit=limit,
            threshold=threshold,
        )
        return [
            MemorySearchResult(
                id=mem.id,
                content=mem.content,
                category=mem.category,
                tags=mem.tags or [],
                source=mem.source,
                score=score,
                created_at=mem.created_at,
            )
            for mem, score in scored
        ]

    async def get_relevant_context(self, query: str, limit: int = 3) -> str:
        """Retrieve relevant memories formatted as prompt context."""
        results = await self.search(query, limit=limit, threshold=0.4)
        if not results:
            return ""
        items = "\n".join([f"- [{r.category}] {r.content}" for r in results])
        return f"\nRelevant user memory/context:\n{items}\n"
