"""Achievement repository."""

import uuid

from sqlalchemy import select

from app.models.achievement import Achievement
from app.repositories.base import BaseRepository


class AchievementRepository(BaseRepository[Achievement]):
    model = Achievement

    async def get_by_user(self, user_id: uuid.UUID) -> list[Achievement]:
        stmt = select(Achievement).where(Achievement.user_id == user_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
