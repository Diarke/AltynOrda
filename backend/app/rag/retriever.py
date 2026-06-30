"""Vector similarity retrieval for RAG."""

import logging
import uuid

from app.ai.service import AIService
from app.config import get_settings
from app.core.unit_of_work import UnitOfWork
from app.schemas.chat import ChatSource

logger = logging.getLogger(__name__)


class RAGRetriever:
    """Retrieve relevant historical context via pgvector similarity search."""

    def __init__(self, uow: UnitOfWork, ai_service: AIService) -> None:
        self._uow = uow
        self._ai = ai_service
        self._settings = get_settings()

    async def retrieve(
        self,
        query: str,
        *,
        city_id: uuid.UUID | None = None,
    ) -> list[ChatSource]:
        """Retrieve top-k similar document chunks for a query."""
        query_embedding = await self._ai.generate_embedding(query)

        results = await self._uow.embeddings.similarity_search(
            query_embedding,
            top_k=self._settings.rag_top_k,
            city_id=city_id,
            threshold=self._settings.rag_similarity_threshold,
        )

        sources: list[ChatSource] = []
        for embedding_entity, similarity in results:
            document = await self._uow.documents.get_by_id(embedding_entity.document_id)
            title = document.title if document else "Unknown Document"
            sources.append(
                ChatSource(
                    document_title=title,
                    chunk_text=embedding_entity.chunk_text,
                    similarity=round(similarity, 4),
                )
            )

        logger.info("RAG retrieved %d sources for query", len(sources))
        return sources
