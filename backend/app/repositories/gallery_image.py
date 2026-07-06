"""Gallery image repository."""

import uuid

from sqlalchemy import func, select

from app.models.gallery_image import GalleryImage
from app.repositories.base import BaseRepository


class GalleryImageRepository(BaseRepository[GalleryImage]):
    model = GalleryImage

    async def get_by_group_key(self, group_key: uuid.UUID) -> list[GalleryImage]:
        stmt = select(GalleryImage).where(GalleryImage.group_key == group_key)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    def _search_stmt(self, language: str | None, group_key: uuid.UUID | None):
        stmt = select(GalleryImage)
        if language is not None:
            stmt = stmt.where(GalleryImage.language == language)
        if group_key is not None:
            stmt = stmt.where(GalleryImage.group_key == group_key)
        return stmt

    async def search(
        self,
        *,
        language: str | None = None,
        group_key: uuid.UUID | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[GalleryImage]:
        stmt = (
            self._search_stmt(language, group_key)
            .order_by(GalleryImage.sort_order.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self, *, language: str | None = None, group_key: uuid.UUID | None = None
    ) -> int:
        stmt = select(func.count()).select_from(
            self._search_stmt(language, group_key).subquery()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
