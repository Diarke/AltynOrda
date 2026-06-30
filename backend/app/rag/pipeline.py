"""End-to-end RAG pipeline orchestration."""

import logging
import uuid

from app.ai.schemas import AIChatMessage
from app.ai.service import AIService
from app.core.unit_of_work import UnitOfWork
from app.rag.embeddings import EmbeddingService
from app.rag.retriever import RAGRetriever
from app.schemas.chat import ChatResponse

logger = logging.getLogger(__name__)


class RAGPipeline:
    """Orchestrates retrieval-augmented generation for the AI historian."""

    def __init__(self, uow: UnitOfWork, ai_service: AIService) -> None:
        self._uow = uow
        self._ai = ai_service
        self._retriever = RAGRetriever(uow, ai_service)
        self._embedding_service = EmbeddingService(uow, ai_service)

    async def query(
        self,
        user_message: str,
        *,
        city_id: uuid.UUID | None = None,
        chat_history: list[AIChatMessage] | None = None,
    ) -> ChatResponse:
        """Execute full RAG pipeline: retrieve → generate."""
        sources = await self._retriever.retrieve(user_message, city_id=city_id)
        context_chunks = [s.chunk_text for s in sources]

        sufficient = await self._ai.verify_context_sufficiency(context_chunks)
        if not sufficient:
            return ChatResponse(
                answer=self._ai.get_insufficient_context_message(),
                sources=sources,
                verified=False,
            )

        answer = await self._ai.generate_historian_response(
            user_message,
            context_chunks,
            chat_history=chat_history,
        )

        return ChatResponse(
            answer=answer,
            sources=sources,
            verified=True,
        )

    async def index_document(self, document_id: uuid.UUID) -> int:
        """Index a historical document for RAG."""
        return await self._embedding_service.embed_document(document_id)

    async def index_all_pending(self) -> int:
        """Index all unembedded documents."""
        return await self._embedding_service.embed_all_pending()
