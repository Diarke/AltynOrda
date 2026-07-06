"""Quest service."""

import uuid

from app.core.unit_of_work import UnitOfWork
from app.enums import ProgressType, QuestStatus
from app.exceptions import NotFoundException
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.user import User
from app.schemas.common import PaginatedMeta
from app.schemas.quest import QuestResponse


class QuestService:
    """Quest management."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def list_quests(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        city_id: uuid.UUID | None = None,
        current_user: User | None = None,
    ) -> tuple[list[QuestResponse], PaginatedMeta]:
        offset = (page - 1) * page_size
        if city_id is not None:
            city = await self._uow.cities.get_by_id(city_id)
            if city is None:
                raise NotFoundException("City not found")
            quests = await self._uow.quests.get_by_city(city_id, offset=offset, limit=page_size)
            total = len(await self._uow.quests.get_by_city(city_id, offset=0, limit=10000))
        else:
            quests = await self._uow.quests.get_all(offset=offset, limit=page_size)
            total = await self._uow.quests.count()

        progress_by_quest = await self._get_progress_lookup(current_user)
        return [
            self._to_response(q, progress_by_quest.get(q.id)) for q in quests
        ], PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_quest(
        self, quest_id: uuid.UUID, *, current_user: User | None = None
    ) -> QuestResponse:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        progress_by_quest = await self._get_progress_lookup(current_user)
        return self._to_response(quest, progress_by_quest.get(quest_id))

    async def _get_progress_lookup(
        self, current_user: User | None
    ) -> dict[uuid.UUID, Progress]:
        if current_user is None:
            return {}
        records = await self._uow.progress.get_by_user_and_entity_type(
            current_user.id, ProgressType.QUEST
        )
        return {record.entity_id: record for record in records}

    @staticmethod
    def _to_response(quest: Quest, progress: Progress | None = None) -> QuestResponse:
        completion_status = progress.status if progress is not None else QuestStatus.NOT_STARTED
        cooldown_until = progress.cooldown_until if progress is not None else None
        return QuestResponse(
            id=quest.id,
            city_id=quest.city_id,
            title=quest.title,
            description=quest.description,
            difficulty=quest.difficulty,
            points=quest.points,
            xp_reward=quest.xp_reward,
            coin_reward=quest.coin_reward,
            cooldown_hours=quest.cooldown_hours,
            estimated_time_minutes=quest.estimated_time_minutes,
            category=quest.category,
            status=quest.status,
            completion_status=completion_status,
            cooldown_until=cooldown_until,
            created_at=quest.created_at,
        )
