"""Homepage content repository."""

import uuid

from sqlalchemy import func, select

from app.models.homepage_content import HomepageContent
from app.repositories.base import BaseRepository


class HomepageContentRepository(BaseRepository[HomepageContent]):
    model = HomepageContent

    async def get_by_group_key(self, group_key: uuid.UUID) -> list[HomepageContent]:
        stmt = select(HomepageContent).where(HomepageContent.group_key == group_key)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    def _search_stmt(self, section: str | None, language: str | None):
        stmt = select(HomepageContent)
        if section is not None:
            stmt = stmt.where(HomepageContent.section == section)
        if language is not None:
            stmt = stmt.where(HomepageContent.language == language)
        return stmt

    async def search(
        self,
        *,
        section: str | None = None,
        language: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[HomepageContent]:
        stmt = (
            self._search_stmt(section, language)
            .order_by(HomepageContent.section.asc(), HomepageContent.sort_order.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(self, *, section: str | None = None, language: str | None = None) -> int:
        stmt = select(func.count()).select_from(
            self._search_stmt(section, language).subquery()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
