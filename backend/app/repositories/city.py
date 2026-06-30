"""City repository."""

from sqlalchemy import select

from app.models.city import City
from app.repositories.base import BaseRepository


class CityRepository(BaseRepository[City]):
    model = City

    async def get_by_slug(self, slug: str) -> City | None:
        stmt = select(City).where(City.slug == slug)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def search_by_name(self, query: str, *, offset: int = 0, limit: int = 20) -> list[City]:
        stmt = (
            select(City)
            .where(City.name.ilike(f"%{query}%"))
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
