"""Quest schemas."""

import uuid
from datetime import datetime

from app.enums import QuestStatus
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
    created_at: datetime
