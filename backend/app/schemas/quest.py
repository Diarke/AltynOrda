"""Quest schemas."""

import uuid
from datetime import datetime
from typing import Any

from app.enums import MiniGameType, QuestStatus
from app.schemas.common import BaseSchema


class QuestResponse(BaseSchema):
    id: uuid.UUID
    city_id: uuid.UUID
    title: str
    description: str
    difficulty: str
    points: int
    xp_reward: int
    coin_reward: int
    cooldown_hours: int
    estimated_time_minutes: int
    category: str
    status: QuestStatus
    completion_status: QuestStatus = QuestStatus.NOT_STARTED
    cooldown_until: datetime | None = None
    # Null for the ~40 quests that keep the plain instant-complete button.
    # When set, `game_data` is already resolved to the requested language
    # (see QuestService._resolve_game_data) — a plain dict, not raw JSON text.
    game_type: MiniGameType | None = None
    game_data: dict[str, Any] | None = None
    created_at: datetime
