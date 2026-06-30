"""Quest repository."""

import uuid

from sqlalchemy import select

from app.models.quest import Quest
from app.repositories.base import BaseRepository


class QuestRepository(BaseRepository[Quest]):
    model = Quest

    async def get_by_city(
        self, city_id: uuid.UUID, *, offset: int = 0, limit: int = 20
    ) -> list[Quest]:
        stmt = (
            select(Quest)
            .where(Quest.city_id == city_id)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
