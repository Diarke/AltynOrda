"""Artifact repository."""

import uuid

from sqlalchemy import select

from app.models.artifact import Artifact
from app.repositories.base import BaseRepository


class ArtifactRepository(BaseRepository[Artifact]):
    model = Artifact

    async def get_by_city(
        self, city_id: uuid.UUID, *, offset: int = 0, limit: int = 20
    ) -> list[Artifact]:
        stmt = (
            select(Artifact)
            .where(Artifact.city_id == city_id)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_city(self, city_id: uuid.UUID) -> int:
        from sqlalchemy import func

        stmt = select(func.count()).select_from(Artifact).where(Artifact.city_id == city_id)
        result = await self.session.execute(stmt)
        return result.scalar_one()
