"""Embedding repository with pgvector similarity search."""

import uuid

from sqlalchemy import select, text

from app.models.embedding import EMBEDDING_DIMENSION, DocumentEmbedding
from app.repositories.base import BaseRepository


class EmbeddingRepository(BaseRepository[DocumentEmbedding]):
    model = DocumentEmbedding

    async def similarity_search(
        self,
        query_embedding: list[float],
        *,
        top_k: int = 5,
        city_id: uuid.UUID | None = None,
        threshold: float = 0.7,
    ) -> list[tuple[DocumentEmbedding, float]]:
        """Find most similar document chunks using cosine distance."""
        if len(query_embedding) != EMBEDDING_DIMENSION:
            msg = f"Embedding dimension mismatch: expected {EMBEDDING_DIMENSION}"
            raise ValueError(msg)

        embedding_str = "[" + ",".join(str(v) for v in query_embedding) + "]"

        city_filter = ""
        params: dict[str, object] = {
            "embedding": embedding_str,
            "top_k": top_k,
            "threshold": threshold,
        }
        if city_id is not None:
            city_filter = """
                AND hd.city_id = :city_id
            """
            params["city_id"] = str(city_id)

        # `CAST(:embedding AS vector)` instead of the `:embedding::vector` cast shorthand —
        # asyncpg's prepared-statement handling chokes on a `::` cast operator sitting directly
        # against a named bind parameter (`PostgresSyntaxError: syntax error at or near ":"`).
        # CAST(...) is unambiguous SQL and compiles cleanly through SQLAlchemy's asyncpg dialect.
        sql = text(f"""
            SELECT de.id, 1 - (de.embedding <=> CAST(:embedding AS vector)) AS similarity
            FROM document_embeddings de
            JOIN historical_documents hd ON hd.id = de.document_id
            WHERE 1 - (de.embedding <=> CAST(:embedding AS vector)) >= :threshold
            {city_filter}
            ORDER BY de.embedding <=> CAST(:embedding AS vector)
            LIMIT :top_k
        """)

        result = await self.session.execute(sql, params)
        rows = result.fetchall()

        embeddings: list[tuple[DocumentEmbedding, float]] = []
        for row in rows:
            entity = await self.get_by_id(row[0])
            if entity is not None:
                embeddings.append((entity, float(row[1])))
        return embeddings

    async def delete_by_document(self, document_id: uuid.UUID) -> None:
        stmt = select(DocumentEmbedding).where(DocumentEmbedding.document_id == document_id)
        result = await self.session.execute(stmt)
        for entity in result.scalars().all():
            await self.session.delete(entity)
        await self.session.flush()
