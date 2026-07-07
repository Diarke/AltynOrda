"""Base repository with generic CRUD operations."""

import uuid
from typing import Any, Generic, TypeVar

from sqlalchemy import Select, func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.database.base import Base

ModelT = TypeVar("ModelT", bound=Base)


class BaseRepository(Generic[ModelT]):
    """Generic async repository for SQLAlchemy models."""

    model: type[ModelT]

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get_by_id(self, entity_id: uuid.UUID) -> ModelT | None:
        return await self.session.get(self.model, entity_id)

    async def get_all(
        self,
        *,
        offset: int = 0,
        limit: int = 20,
    ) -> list[ModelT]:
        stmt = select(self.model).offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count(self) -> int:
        stmt = select(func.count()).select_from(self.model)
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def create(self, entity: ModelT) -> ModelT:
        self.session.add(entity)
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def update(self, entity: ModelT) -> ModelT:
        await self.session.flush()
        await self.session.refresh(entity)
        return entity

    async def delete(self, entity: ModelT) -> None:
        await self.session.delete(entity)
        await self.session.flush()

    def _paginate(
        self, stmt: Select[tuple[ModelT]], offset: int, limit: int
    ) -> Select[tuple[ModelT]]:
        return stmt.offset(offset).limit(limit)

    def _apply_search(
        self,
        stmt: Select,
        *,
        search_query: str | None = None,
        search_fields: list[str] | None = None,
        filters: dict[str, Any] | None = None,
    ) -> Select:
        """Add a case-insensitive OR search across `search_fields` and equality
        filters for every non-None entry in `filters`. Shared by every admin
        list endpoint so search/filtering behaves consistently across entities.
        """
        if search_query and search_fields:
            conditions = [
                getattr(self.model, field).ilike(f"%{search_query}%") for field in search_fields
            ]
            stmt = stmt.where(or_(*conditions))
        if filters:
            for field, value in filters.items():
                if value is not None:
                    stmt = stmt.where(getattr(self.model, field) == value)
        return stmt

    async def search(
        self,
        *,
        search_query: str | None = None,
        search_fields: list[str] | None = None,
        filters: dict[str, Any] | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[ModelT]:
        stmt = self._apply_search(
            select(self.model), search_query=search_query, search_fields=search_fields, filters=filters
        )
        stmt = stmt.offset(offset).limit(limit)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        *,
        search_query: str | None = None,
        search_fields: list[str] | None = None,
        filters: dict[str, Any] | None = None,
    ) -> int:
        stmt = self._apply_search(
            select(func.count()).select_from(self.model),
            search_query=search_query,
            search_fields=search_fields,
            filters=filters,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
