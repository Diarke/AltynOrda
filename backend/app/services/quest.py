"""Quest service."""

import uuid

from app.core.unit_of_work import UnitOfWork
from app.exceptions import NotFoundException
from app.models.quest import Quest
from app.schemas.common import PaginatedMeta
from app.schemas.quest import QuestResponse


class QuestService:
    """Quest management."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def list_quests(
        self, *, page: int = 1, page_size: int = 20, city_id: uuid.UUID | None = None
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

        return [self._to_response(q) for q in quests], PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_quest(self, quest_id: uuid.UUID) -> QuestResponse:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        return self._to_response(quest)

    @staticmethod
    def _to_response(quest: Quest) -> QuestResponse:
        return QuestResponse(
            id=quest.id,
            city_id=quest.city_id,
            title=quest.title,
            description=quest.description,
            difficulty=quest.difficulty,
            points=quest.points,
            status=quest.status,
            created_at=quest.created_at,
        )
