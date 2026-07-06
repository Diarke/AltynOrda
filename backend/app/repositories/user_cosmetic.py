"""User cosmetic repository."""

import uuid

from sqlalchemy import select

from app.models.user_cosmetic import UserCosmetic
from app.repositories.base import BaseRepository


class UserCosmeticRepository(BaseRepository[UserCosmetic]):
    model = UserCosmetic

    async def get_by_user(self, user_id: uuid.UUID) -> list[UserCosmetic]:
        stmt = select(UserCosmetic).where(UserCosmetic.user_id == user_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_by_user_and_key(self, user_id: uuid.UUID, item_key: str) -> UserCosmetic | None:
        stmt = select(UserCosmetic).where(
            UserCosmetic.user_id == user_id, UserCosmetic.item_key == item_key
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
