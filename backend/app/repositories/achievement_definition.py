"""Achievement definition (catalog) repository."""

from sqlalchemy import select

from app.models.achievement_definition import AchievementDefinition
from app.repositories.base import BaseRepository


class AchievementDefinitionRepository(BaseRepository[AchievementDefinition]):
    model = AchievementDefinition

    async def get_by_key(self, key: str) -> AchievementDefinition | None:
        stmt = select(AchievementDefinition).where(AchievementDefinition.key == key)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_active(self) -> list[AchievementDefinition]:
        stmt = (
            select(AchievementDefinition)
            .where(AchievementDefinition.is_active.is_(True))
            .order_by(AchievementDefinition.sort_order.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
