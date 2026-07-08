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

    async def get_ordered(self) -> list[City]:
        """All cities in linear-journey order — ties broken by creation order."""
        stmt = select(City).order_by(City.sort_order, City.created_at)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_first(self) -> City | None:
        """The city that opens a brand-new user's journey."""
        stmt = select(City).order_by(City.sort_order, City.created_at).limit(1)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_next(self, current_sort_order: int) -> City | None:
        """The next city after `current_sort_order` in the journey sequence, or
        None if `current_sort_order` belongs to the last city."""
        stmt = (
            select(City)
            .where(City.sort_order > current_sort_order)
            .order_by(City.sort_order, City.created_at)
            .limit(1)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
