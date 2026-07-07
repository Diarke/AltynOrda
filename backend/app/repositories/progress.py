"""Progress repository."""

import uuid

from sqlalchemy import select

from app.enums import ProgressType
from app.models.progress import Progress
from app.repositories.base import BaseRepository


class ProgressRepository(BaseRepository[Progress]):
    model = Progress

    async def get_by_user(
        self, user_id: uuid.UUID, *, offset: int = 0, limit: int = 50
    ) -> list[Progress]:
        stmt = (
            select(Progress)
            .where(Progress.user_id == user_id)
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def get_user_entity_progress(
        self,
        user_id: uuid.UUID,
        entity_type: ProgressType,
        entity_id: uuid.UUID,
    ) -> Progress | None:
        stmt = select(Progress).where(
            Progress.user_id == user_id,
            Progress.entity_type == entity_type,
            Progress.entity_id == entity_id,
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_user_and_entity_type(
        self, user_id: uuid.UUID, entity_type: ProgressType
    ) -> list[Progress]:
        stmt = select(Progress).where(
            Progress.user_id == user_id, Progress.entity_type == entity_type
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_completed_by_user(self, user_id: uuid.UUID) -> int:
        from sqlalchemy import func

        from app.enums import QuestStatus

        stmt = (
            select(func.count())
            .select_from(Progress)
            .where(Progress.user_id == user_id, Progress.status == QuestStatus.COMPLETED)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def count_completed_by_user_and_type(
        self, user_id: uuid.UUID, entity_type: ProgressType
    ) -> int:
        from sqlalchemy import func

        from app.enums import QuestStatus

        stmt = (
            select(func.count())
            .select_from(Progress)
            .where(
                Progress.user_id == user_id,
                Progress.entity_type == entity_type,
                Progress.status == QuestStatus.COMPLETED,
            )
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()
