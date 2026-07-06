"""Historical document repository."""

import uuid

from sqlalchemy import func, select

from app.models.historical_document import HistoricalDocument
from app.repositories.base import BaseRepository


class HistoricalDocumentRepository(BaseRepository[HistoricalDocument]):
    model = HistoricalDocument

    async def count_embeddings(self, document_id: uuid.UUID) -> int:
        from app.models.embedding import DocumentEmbedding

        stmt = (
            select(func.count())
            .select_from(DocumentEmbedding)
            .where(DocumentEmbedding.document_id == document_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_by_city(self, city_id: uuid.UUID) -> list[HistoricalDocument]:
        stmt = select(HistoricalDocument).where(HistoricalDocument.city_id == city_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_unembedded(self, *, limit: int = 50) -> list[HistoricalDocument]:
        from app.models.embedding import DocumentEmbedding

        subq = select(DocumentEmbedding.document_id).distinct()
        stmt = (
            select(HistoricalDocument)
            .where(HistoricalDocument.id.not_in(subq))
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
