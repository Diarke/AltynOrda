"""Admin-related schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.enums import AchievementType, DocumentSourceType, UserRole
from app.schemas.auth import UserResponse
from app.schemas.common import BaseSchema


class AdminStatisticsResponse(BaseSchema):
    total_users: int
    new_users: int
    daily_active_users: int
    completed_quests: int
    average_xp: int
    average_coins: int
    most_visited_city: str | None = None
    most_popular_artifact: str | None = None
    most_used_ai_prompt: str | None = None
    certificates_issued: int


class AdminUserUpdateRequest(BaseSchema):
    role: UserRole | None = None
    is_active: bool | None = None


class AdminCityCreateRequest(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    description: str
    historical_period: str = Field(max_length=100)
    latitude: float
    longitude: float
    image_url: str | None = None
    population_estimate: str | None = None
    significance: str | None = None


class AdminArtifactCreateRequest(BaseSchema):
    city_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    description: str
    era: str = Field(max_length=100)
    rarity: str = Field(default="common", max_length=50)
    image_url: str | None = None
    historical_context: str | None = None


class AdminQuestCreateRequest(BaseSchema):
    city_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str
    difficulty: str = Field(default="medium", max_length=50)
    points: int = Field(default=100, ge=0)
    status: str = Field(default="not_started")
    quiz_questions: str | None = None


class AdminGalleryImageCreateRequest(BaseSchema):
    title: str | None = None
    description: str | None = None
    image_url: str
    alt_text: str | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminHomepageContentCreateRequest(BaseSchema):
    section: str = Field(min_length=1, max_length=100)
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    cta_text: str | None = None
    cta_url: str | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminGamificationSettingCreateRequest(BaseSchema):
    key: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=500)


class AdminSystemSettingCreateRequest(BaseSchema):
    key: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=500)


class AdminHistoricalDocumentCreateRequest(BaseSchema):
    city_id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=500)
    content: str
    source: str = Field(min_length=1, max_length=255)
    source_type: DocumentSourceType = DocumentSourceType.SECONDARY
    author: str | None = None
    year: str | None = None


class AdminCertificateCreateRequest(BaseSchema):
    user_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str
    completion_percent: int = Field(ge=0, le=100)
    certificate_code: str = Field(min_length=1, max_length=64)
    issued_at: str = Field(min_length=1, max_length=50)


class AdminAchievementCreateRequest(BaseSchema):
    user_id: uuid.UUID
    achievement_type: AchievementType
    title: str = Field(min_length=1, max_length=255)
    description: str
    icon_url: str | None = None


class AdminUploadResponse(BaseSchema):
    url: str
    bucket: str
    key: str
    created_at: datetime | None = None
