"""Progress schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.enums import ProgressType, QuestStatus
from app.schemas.common import BaseSchema


class ProgressResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    entity_type: ProgressType
    entity_id: uuid.UUID
    status: QuestStatus
    score: int
    notes: str | None
    created_at: datetime
    updated_at: datetime


class ProgressCreateRequest(BaseSchema):
    entity_type: ProgressType
    entity_id: uuid.UUID
    status: QuestStatus = QuestStatus.IN_PROGRESS
    score: int = Field(default=0, ge=0)
    notes: str | None = None


class ProgressUpdateRequest(BaseSchema):
    status: QuestStatus | None = None
    score: int | None = Field(default=None, ge=0)
    notes: str | None = None


class UserProgressSummary(BaseSchema):
    total_completed: int
    total_in_progress: int
    completion_percent: float
    records: list[ProgressResponse]
