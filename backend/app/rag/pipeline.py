"""End-to-end RAG pipeline orchestration."""

import logging
import uuid

from app.ai.exceptions import AIException
from app.ai.schemas import AIChatMessage
from app.ai.service import AIService
from app.core.unit_of_work import UnitOfWork
from app.enums import Language
from app.rag.embeddings import EmbeddingService
from app.rag.retriever import RAGRetriever
from app.schemas.chat import ChatResponse, ChatSource

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
        language: Language = Language.ENGLISH,
    ) -> ChatResponse:
        """Execute the RAG pipeline: retrieve → generate.

        Retrieval (embedding generation + pgvector similarity search) is never allowed
        to take the AI Historian down — if it raises for any reason (DB error, pgvector
        extension issue, embedding failure, etc.) it's logged and treated the same as
        "found nothing", falling through to a general-knowledge answer from Groq instead
        of surfacing an error to the user.
        """
        sources: list[ChatSource] = []
        try:
            sources = await self._retriever.retrieve(user_message, city_id=city_id)
        except Exception:
            logger.exception("RAG retrieval failed; falling back to general knowledge")
            sources = []

        context_chunks = [s.chunk_text for s in sources]
        sufficient = bool(context_chunks) and await self._ai.verify_context_sufficiency(context_chunks)

        if sufficient:
            answer = await self._ai.generate_historian_response(
                user_message,
                context_chunks,
                chat_history=chat_history,
                language=language,
            )
            return ChatResponse(answer=answer, sources=sources, verified=True)

        # No verified context (retrieval failed, or genuinely found nothing relevant) —
        # answer from the model's own general knowledge rather than refusing outright.
        try:
            answer = await self._ai.generate_general_response(
                user_message,
                chat_history=chat_history,
                language=language,
            )
        except AIException:
            logger.exception("General-knowledge fallback also failed; returning canned response")
            answer = self._ai.get_insufficient_context_message(language)

        return ChatResponse(answer=answer, sources=sources, verified=False)

    async def index_document(self, document_id: uuid.UUID) -> int:
        """Index a historical document for RAG."""
        return await self._embedding_service.embed_document(document_id)

    async def index_all_pending(self) -> int:
        """Index all unembedded documents."""
        return await self._embedding_service.embed_all_pending()
