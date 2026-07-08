"""Progress schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.enums import ProgressType, QuestStatus
from app.schemas.city import CitySummaryResponse
from app.schemas.common import BaseSchema


class ProgressResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    entity_type: ProgressType
    entity_id: uuid.UUID
    status: QuestStatus
    score: int
    completed_at: datetime | None
    cooldown_until: datetime | None
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


class AchievementResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    achievement_type: str
    title: str
    description: str
    icon_url: str | None
    reward_xp: int
    reward_coins: int
    achieved_at: datetime | None


class ProgressStatsResponse(BaseSchema):
    user_id: uuid.UUID
    level: int
    title: str
    xp: int
    coins: int
    streak_days: int
    unlocks: dict[str, list[str]]


class QuestCompletionResponse(BaseSchema):
    success: bool
    message: str
    xp_gained: int
    coins_gained: int
    level: int
    unlocks: dict[str, list[str]]
    # Set when this quest was the city's last required one — the next city in the
    # linear journey sequence just opened, so the frontend can animate it in place.
    unlocked_city: CitySummaryResponse | None = None


class DailyLoginResponse(BaseSchema):
    success: bool
    message: str
    streak_days: int
    xp_gained: int
    coins_gained: int
    level: int
    unlocks: dict[str, list[str]]


class CoinSpendResponse(BaseSchema):
    success: bool
    message: str
    coins_spent: int
    remaining_coins: int


class LeaderboardEntry(BaseSchema):
    user_id: uuid.UUID
    username: str
    level: int
    xp: int
    coins: int
    achievement_count: int
    streak_days: int


class LeaderboardResponse(BaseSchema):
    xp: list[LeaderboardEntry]
    coins: list[LeaderboardEntry]
    achievements: list[LeaderboardEntry]
    streaks: list[LeaderboardEntry]


class CosmeticItemResponse(BaseSchema):
    key: str
    name: str
    cost_coins: int
    unlocked: bool
    equipped: bool


class CosmeticCatalogResponse(BaseSchema):
    items: list[CosmeticItemResponse]


class CosmeticActionResponse(BaseSchema):
    success: bool
    message: str
    equipped_frame: str
    remaining_coins: int
