"""Quest service."""

import json
import uuid
from typing import Any

from app.core.unit_of_work import UnitOfWork
from app.enums import Language, ProgressType, QuestStatus
from app.exceptions import NotFoundException
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.user import User
from app.schemas.common import PaginatedMeta
from app.schemas.quest import QuestResponse
from app.utils.i18n import resolve_localized

# Which of a mini-game's JSON item fields are per-language (`<field>_kk/_ru/_en`,
# resolved down to a plain `text`/`label` key) versus passed through as-is.
_GAME_ITEM_LOCALIZED_FIELD = {
    "khans_court": ("statements", "text"),
    "chronograph": ("events", "text"),
    "caravan_builder": ("goods", "label"),
}


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
        language: Language = Language.KAZAKH,
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
            self._to_response(q, progress_by_quest.get(q.id), language) for q in quests
        ], PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_quest(
        self,
        quest_id: uuid.UUID,
        *,
        current_user: User | None = None,
        language: Language = Language.KAZAKH,
    ) -> QuestResponse:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        progress_by_quest = await self._get_progress_lookup(current_user)
        return self._to_response(quest, progress_by_quest.get(quest_id), language)

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
    def _to_response(
        quest: Quest, progress: Progress | None, language: Language
    ) -> QuestResponse:
        completion_status = progress.status if progress is not None else QuestStatus.NOT_STARTED
        cooldown_until = progress.cooldown_until if progress is not None else None
        return QuestResponse(
            id=quest.id,
            city_id=quest.city_id,
            title=resolve_localized(quest, "title", language),
            description=resolve_localized(quest, "description", language),
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
            game_type=quest.game_type,
            game_data=QuestService._resolve_game_data(quest, language),
            created_at=quest.created_at,
        )

    @staticmethod
    def _resolve_game_data(quest: Quest, language: Language) -> dict[str, Any] | None:
        """Parse `Quest.game_data` and collapse each item's `<field>_kk/_ru/_en`
        trio down to a single localized `text`/`label`, the same fallback order
        as `resolve_localized` (requested language → kk → en → ru), but for
        plain dict items rather than ORM attributes.
        """
        if quest.game_type is None or not quest.game_data:
            return None
        mapping = _GAME_ITEM_LOCALIZED_FIELD.get(quest.game_type.value)
        if mapping is None:
            return None
        list_key, field = mapping
        raw = json.loads(quest.game_data)
        items = raw.get(list_key, [])

        def localize(item: dict[str, Any]) -> dict[str, Any]:
            resolved = None
            for lang in (language.value, "kk", "en", "ru"):
                value = item.get(f"{field}_{lang}")
                if value:
                    resolved = value
                    break
            passthrough = {k: v for k, v in item.items() if not k.startswith(f"{field}_")}
            return {**passthrough, field: resolved}

        return {list_key: [localize(item) for item in items]}
