"""Admin-related schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.enums import AchievementMetric, DocumentSourceType, Language, UserRole
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


class AdminUserResponse(UserResponse):
    """Admin view of a user account, exposing gameplay fields not in the public profile."""

    xp: int
    coins: int
    level: int
    streak_days: int
    equipped_frame: str


class AdminUserUpdateRequest(BaseSchema):
    role: UserRole | None = None
    is_active: bool | None = None
    xp: int | None = Field(default=None, ge=0)
    coins: int | None = Field(default=None, ge=0)
    level: int | None = Field(default=None, ge=1)


# ─── Cities ─────────────────────────────────────────────────────────────────


class AdminCityResponse(BaseSchema):
    id: uuid.UUID
    slug: str
    latitude: float
    longitude: float
    image_url: str | None
    name_kk: str | None
    name_ru: str | None
    name_en: str | None
    description_kk: str | None
    description_ru: str | None
    description_en: str | None
    historical_period_kk: str | None
    historical_period_ru: str | None
    historical_period_en: str | None
    population_estimate_kk: str | None
    population_estimate_ru: str | None
    population_estimate_en: str | None
    significance_kk: str | None
    significance_ru: str | None
    significance_en: str | None
    historical_facts_kk: list[str] | None
    historical_facts_ru: list[str] | None
    historical_facts_en: list[str] | None
    trade_info_kk: str | None
    trade_info_ru: str | None
    trade_info_en: str | None
    created_at: datetime


class AdminCityCreateRequest(BaseSchema):
    slug: str = Field(min_length=1, max_length=255)
    latitude: float
    longitude: float
    image_url: str | None = None
    name_kk: str = Field(min_length=1, max_length=255)
    name_ru: str | None = None
    name_en: str | None = None
    description_kk: str
    description_ru: str | None = None
    description_en: str | None = None
    historical_period_kk: str = Field(max_length=100)
    historical_period_ru: str | None = Field(default=None, max_length=100)
    historical_period_en: str | None = Field(default=None, max_length=100)
    population_estimate_kk: str | None = None
    population_estimate_ru: str | None = None
    population_estimate_en: str | None = None
    significance_kk: str | None = None
    significance_ru: str | None = None
    significance_en: str | None = None
    historical_facts_kk: list[str] | None = None
    historical_facts_ru: list[str] | None = None
    historical_facts_en: list[str] | None = None
    trade_info_kk: str | None = None
    trade_info_ru: str | None = None
    trade_info_en: str | None = None


class AdminCityUpdateRequest(BaseSchema):
    slug: str | None = Field(default=None, min_length=1, max_length=255)
    latitude: float | None = None
    longitude: float | None = None
    image_url: str | None = None
    name_kk: str | None = Field(default=None, min_length=1, max_length=255)
    name_ru: str | None = None
    name_en: str | None = None
    description_kk: str | None = None
    description_ru: str | None = None
    description_en: str | None = None
    historical_period_kk: str | None = Field(default=None, max_length=100)
    historical_period_ru: str | None = Field(default=None, max_length=100)
    historical_period_en: str | None = Field(default=None, max_length=100)
    population_estimate_kk: str | None = None
    population_estimate_ru: str | None = None
    population_estimate_en: str | None = None
    significance_kk: str | None = None
    significance_ru: str | None = None
    significance_en: str | None = None
    historical_facts_kk: list[str] | None = None
    historical_facts_ru: list[str] | None = None
    historical_facts_en: list[str] | None = None
    trade_info_kk: str | None = None
    trade_info_ru: str | None = None
    trade_info_en: str | None = None


# ─── Artifacts ──────────────────────────────────────────────────────────────


class AdminArtifactResponse(BaseSchema):
    id: uuid.UUID
    city_id: uuid.UUID
    rarity: str
    image_url: str | None
    name_kk: str | None
    name_ru: str | None
    name_en: str | None
    description_kk: str | None
    description_ru: str | None
    description_en: str | None
    era_kk: str | None
    era_ru: str | None
    era_en: str | None
    historical_context_kk: str | None
    historical_context_ru: str | None
    historical_context_en: str | None
    created_at: datetime


class AdminArtifactCreateRequest(BaseSchema):
    city_id: uuid.UUID
    rarity: str = Field(default="common", max_length=50)
    image_url: str | None = None
    name_kk: str = Field(min_length=1, max_length=255)
    name_ru: str | None = None
    name_en: str | None = None
    description_kk: str
    description_ru: str | None = None
    description_en: str | None = None
    era_kk: str = Field(max_length=100)
    era_ru: str | None = Field(default=None, max_length=100)
    era_en: str | None = Field(default=None, max_length=100)
    historical_context_kk: str | None = None
    historical_context_ru: str | None = None
    historical_context_en: str | None = None


class AdminArtifactUpdateRequest(BaseSchema):
    city_id: uuid.UUID | None = None
    rarity: str | None = Field(default=None, max_length=50)
    image_url: str | None = None
    name_kk: str | None = Field(default=None, min_length=1, max_length=255)
    name_ru: str | None = None
    name_en: str | None = None
    description_kk: str | None = None
    description_ru: str | None = None
    description_en: str | None = None
    era_kk: str | None = Field(default=None, max_length=100)
    era_ru: str | None = Field(default=None, max_length=100)
    era_en: str | None = Field(default=None, max_length=100)
    historical_context_kk: str | None = None
    historical_context_ru: str | None = None
    historical_context_en: str | None = None


# ─── Quests ─────────────────────────────────────────────────────────────────


class AdminQuizQuestion(BaseSchema):
    """A single structured quiz question, validated at write time, with each
    translatable part carried in all three languages so the quiz reads
    correctly regardless of the player's language.

    Mirrors exactly what QuizService.submit_quiz expects to find when it later
    parses Quest.quiz_questions as JSON.
    """

    question_kk: str = Field(min_length=1, max_length=1000)
    question_ru: str | None = None
    question_en: str | None = None
    options_kk: list[str] = Field(min_length=2, max_length=8)
    options_ru: list[str] | None = None
    options_en: list[str] | None = None
    correct_answer_kk: str = Field(min_length=1, max_length=500)
    correct_answer_ru: str | None = None
    correct_answer_en: str | None = None


class AdminQuestResponse(BaseSchema):
    id: uuid.UUID
    city_id: uuid.UUID
    difficulty: str
    points: int
    xp_reward: int
    coin_reward: int
    cooldown_hours: int
    estimated_time_minutes: int
    category: str
    status: str
    title_kk: str | None
    title_ru: str | None
    title_en: str | None
    description_kk: str | None
    description_ru: str | None
    description_en: str | None
    quiz_questions: list[AdminQuizQuestion] | None = None
    created_at: datetime


class AdminQuestCreateRequest(BaseSchema):
    city_id: uuid.UUID
    title_kk: str = Field(min_length=1, max_length=255)
    title_ru: str | None = None
    title_en: str | None = None
    description_kk: str
    description_ru: str | None = None
    description_en: str | None = None
    difficulty: str = Field(default="medium", max_length=50)
    points: int = Field(default=100, ge=0)
    xp_reward: int = Field(default=100, ge=0)
    coin_reward: int = Field(default=10, ge=0)
    cooldown_hours: int = Field(default=24, ge=0)
    estimated_time_minutes: int = Field(default=15, ge=0)
    category: str = Field(default="exploration", max_length=50)
    status: str = Field(default="not_started")
    quiz_questions: list[AdminQuizQuestion] | None = None


class AdminQuestUpdateRequest(BaseSchema):
    city_id: uuid.UUID | None = None
    title_kk: str | None = Field(default=None, min_length=1, max_length=255)
    title_ru: str | None = None
    title_en: str | None = None
    description_kk: str | None = None
    description_ru: str | None = None
    description_en: str | None = None
    difficulty: str | None = Field(default=None, max_length=50)
    points: int | None = Field(default=None, ge=0)
    xp_reward: int | None = Field(default=None, ge=0)
    coin_reward: int | None = Field(default=None, ge=0)
    cooldown_hours: int | None = Field(default=None, ge=0)
    estimated_time_minutes: int | None = Field(default=None, ge=0)
    category: str | None = Field(default=None, max_length=50)
    status: str | None = None
    quiz_questions: list[AdminQuizQuestion] | None = None


# ─── Gallery images ─────────────────────────────────────────────────────────


class AdminGalleryImageResponse(BaseSchema):
    id: uuid.UUID
    title: str | None
    description: str | None
    language: Language
    group_key: uuid.UUID | None
    image_url: str
    alt_text: str | None
    sort_order: int
    is_active: bool
    city_id: uuid.UUID | None
    created_at: datetime


class AdminGalleryImageCreateRequest(BaseSchema):
    title: str | None = None
    description: str | None = None
    language: Language
    group_key: uuid.UUID | None = None
    image_url: str
    alt_text: str | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True
    city_id: uuid.UUID | None = None


class AdminGalleryImageUpdateRequest(BaseSchema):
    title: str | None = None
    description: str | None = None
    language: Language | None = None
    group_key: uuid.UUID | None = None
    image_url: str | None = None
    alt_text: str | None = None
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
    city_id: uuid.UUID | None = None


# ─── Homepage content ───────────────────────────────────────────────────────


class AdminHomepageContentResponse(BaseSchema):
    id: uuid.UUID
    section: str
    language: Language
    group_key: uuid.UUID | None
    title: str | None
    body: str | None
    image_url: str | None
    cta_text: str | None
    cta_url: str | None
    sort_order: int
    is_active: bool
    created_at: datetime


class AdminHomepageContentCreateRequest(BaseSchema):
    section: str = Field(min_length=1, max_length=100)
    language: Language
    group_key: uuid.UUID | None = None
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    cta_text: str | None = None
    cta_url: str | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminHomepageContentUpdateRequest(BaseSchema):
    section: str | None = Field(default=None, min_length=1, max_length=100)
    language: Language | None = None
    group_key: uuid.UUID | None = None
    title: str | None = None
    body: str | None = None
    image_url: str | None = None
    cta_text: str | None = None
    cta_url: str | None = None
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


# ─── Gamification / system settings ────────────────────────────────────────


class AdminGamificationSettingResponse(BaseSchema):
    id: uuid.UUID
    key: str
    value: str
    created_at: datetime
    updated_at: datetime


class AdminGamificationSettingCreateRequest(BaseSchema):
    key: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=500)


class AdminGamificationSettingUpdateRequest(BaseSchema):
    value: str = Field(min_length=1, max_length=500)


class AdminSystemSettingResponse(BaseSchema):
    id: uuid.UUID
    key: str
    value: str
    created_at: datetime
    updated_at: datetime


class AdminSystemSettingCreateRequest(BaseSchema):
    key: str = Field(min_length=1, max_length=100)
    value: str = Field(min_length=1, max_length=20000)


class AdminSystemSettingUpdateRequest(BaseSchema):
    value: str = Field(min_length=1, max_length=20000)


class AdminSystemPromptResponse(BaseSchema):
    value: str
    updated_at: datetime | None = None


class AdminSystemPromptUpdateRequest(BaseSchema):
    value: str = Field(min_length=1, max_length=20000)


# ─── Historical documents ───────────────────────────────────────────────────


class AdminHistoricalDocumentResponse(BaseSchema):
    id: uuid.UUID
    city_id: uuid.UUID | None
    title: str
    content: str
    source: str
    source_type: DocumentSourceType
    author: str | None
    year: str | None
    language: Language
    group_key: uuid.UUID | None
    embedded_chunks: int
    created_at: datetime


class AdminHistoricalDocumentCreateRequest(BaseSchema):
    city_id: uuid.UUID | None = None
    title: str = Field(min_length=1, max_length=500)
    content: str
    source: str = Field(min_length=1, max_length=255)
    source_type: DocumentSourceType = DocumentSourceType.SECONDARY
    author: str | None = None
    year: str | None = None
    language: Language
    group_key: uuid.UUID | None = None


class AdminHistoricalDocumentUpdateRequest(BaseSchema):
    city_id: uuid.UUID | None = None
    title: str | None = Field(default=None, min_length=1, max_length=500)
    content: str | None = None
    source: str | None = Field(default=None, min_length=1, max_length=255)
    source_type: DocumentSourceType | None = None
    author: str | None = None
    year: str | None = None
    language: Language | None = None
    group_key: uuid.UUID | None = None


# ─── Certificates & achievements ────────────────────────────────────────────


class AdminCertificateCreateRequest(BaseSchema):
    user_id: uuid.UUID
    title: str = Field(min_length=1, max_length=255)
    description: str
    completion_percent: int = Field(ge=0, le=100)
    certificate_code: str = Field(min_length=1, max_length=64)
    issued_at: str = Field(min_length=1, max_length=50)


class AdminCertificateUpdateRequest(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    completion_percent: int | None = Field(default=None, ge=0, le=100)


class AdminAchievementCreateRequest(BaseSchema):
    user_id: uuid.UUID
    achievement_type: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=255)
    description: str
    icon_url: str | None = None


class AdminAchievementUpdateRequest(BaseSchema):
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    icon_url: str | None = None


# ─── Achievement definitions (catalog) ──────────────────────────────────────


class AdminAchievementDefinitionResponse(BaseSchema):
    id: uuid.UUID
    key: str
    title_kk: str | None
    title_ru: str | None
    title_en: str | None
    description_kk: str | None
    description_ru: str | None
    description_en: str | None
    icon_url: str | None
    metric: AchievementMetric
    threshold: int
    reward_xp: int
    reward_coins: int
    sort_order: int
    is_active: bool
    created_at: datetime


class AdminAchievementDefinitionCreateRequest(BaseSchema):
    key: str = Field(min_length=1, max_length=100)
    title_kk: str = Field(min_length=1, max_length=255)
    title_ru: str | None = None
    title_en: str | None = None
    description_kk: str
    description_ru: str | None = None
    description_en: str | None = None
    icon_url: str | None = None
    metric: AchievementMetric
    threshold: int = Field(ge=0)
    reward_xp: int = Field(default=0, ge=0)
    reward_coins: int = Field(default=0, ge=0)
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminAchievementDefinitionUpdateRequest(BaseSchema):
    key: str | None = Field(default=None, min_length=1, max_length=100)
    title_kk: str | None = Field(default=None, min_length=1, max_length=255)
    title_ru: str | None = None
    title_en: str | None = None
    description_kk: str | None = None
    description_ru: str | None = None
    description_en: str | None = None
    icon_url: str | None = None
    metric: AchievementMetric | None = None
    threshold: int | None = Field(default=None, ge=0)
    reward_xp: int | None = Field(default=None, ge=0)
    reward_coins: int | None = Field(default=None, ge=0)
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


# ─── Historical figures ──────────────────────────────────────────────────────


class AdminHistoricalFigureResponse(BaseSchema):
    id: uuid.UUID
    name: str
    title: str
    description: str
    era: str
    significance: str | None
    image_url: str | None
    city_id: uuid.UUID | None
    sort_order: int
    is_active: bool
    created_at: datetime


class AdminHistoricalFigureCreateRequest(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    description: str
    era: str = Field(max_length=100)
    significance: str | None = None
    image_url: str | None = None
    city_id: uuid.UUID | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminHistoricalFigureUpdateRequest(BaseSchema):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    title: str | None = Field(default=None, min_length=1, max_length=255)
    description: str | None = None
    era: str | None = Field(default=None, max_length=100)
    significance: str | None = None
    image_url: str | None = None
    city_id: uuid.UUID | None = None
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None


# ─── Uploads ─────────────────────────────────────────────────────────────────


class AdminUploadResponse(BaseSchema):
    url: str
    bucket: str
    key: str
    created_at: datetime | None = None


# ─── Analytics ───────────────────────────────────────────────────────────────


class TimeSeriesPoint(BaseSchema):
    date: str
    value: int


class AdminUserGrowthResponse(BaseSchema):
    series: list[TimeSeriesPoint]


class AdminQuestCompletionResponse(BaseSchema):
    series: list[TimeSeriesPoint]
    by_status: dict[str, int]
    top_quests: list[dict[str, str | int]]


class AdminAIUsageResponse(BaseSchema):
    series: list[TimeSeriesPoint]
    total_messages: int


class AdminXPStatsResponse(BaseSchema):
    average_xp: float
    max_xp: int
    buckets: list[dict[str, str | int]]


class AdminCoinHolder(BaseSchema):
    user_id: uuid.UUID
    username: str
    coins: int


class AdminCoinEconomyResponse(BaseSchema):
    total_coins_in_circulation: int
    average_coins: float
    total_coins_spent_on_cosmetics: int
    top_holders: list[AdminCoinHolder]


class AdminCertificatesAnalyticsResponse(BaseSchema):
    series: list[TimeSeriesPoint]
    total_issued: int


class AdminActivityItem(BaseSchema):
    type: str
    user_id: uuid.UUID | None
    username: str | None
    description: str
    created_at: datetime


class AdminRecentActivityResponse(BaseSchema):
    items: list[AdminActivityItem]
