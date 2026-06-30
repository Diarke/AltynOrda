"""Embedding generation for RAG."""

import logging
import uuid

from app.ai.service import AIService
from app.core.unit_of_work import UnitOfWork
from app.models.embedding import DocumentEmbedding
from app.rag.chunker import DocumentChunker

logger = logging.getLogger(__name__)


class EmbeddingService:
    """Generate and store document embeddings."""

    def __init__(self, uow: UnitOfWork, ai_service: AIService) -> None:
        self._uow = uow
        self._ai = ai_service
        self._chunker = DocumentChunker()

    async def embed_document(self, document_id: uuid.UUID) -> int:
        """Chunk and embed a historical document. Returns number of chunks created."""
        document = await self._uow.documents.get_by_id(document_id)
        if document is None:
            return 0

        await self._uow.embeddings.delete_by_document(document_id)
        chunks = self._chunker.chunk(document.content)

        for index, chunk_text in enumerate(chunks):
            embedding_vector = await self._ai.generate_embedding(chunk_text)
            entity = DocumentEmbedding(
                document_id=document_id,
                chunk_index=index,
                chunk_text=chunk_text,
                embedding=embedding_vector,
            )
            await self._uow.embeddings.create(entity)

        logger.info("Embedded document %s with %d chunks", document_id, len(chunks))
        return len(chunks)

    async def embed_all_pending(self, *, limit: int = 50) -> int:
        """Embed all documents without embeddings."""
        documents = await self._uow.documents.get_unembedded(limit=limit)
        total_chunks = 0
        for doc in documents:
            total_chunks += await self.embed_document(doc.id)
        return total_chunks
