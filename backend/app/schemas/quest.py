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
    status: QuestStatus
    created_at: datetime
