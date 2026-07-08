"""Application-wide enumerations."""

from enum import StrEnum


class UserRole(StrEnum):
    GUEST = "guest"
    USER = "user"
    ADMIN = "admin"


class QuestStatus(StrEnum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"


class ProgressType(StrEnum):
    QUEST = "quest"
    ARTIFACT = "artifact"
    CITY = "city"
    QUIZ = "quiz"


class AchievementMetric(StrEnum):
    """User stat an AchievementDefinition's threshold is evaluated against."""

    XP = "xp"
    COINS = "coins"
    LEVEL = "level"
    STREAK_DAYS = "streak_days"
    QUESTS_COMPLETED = "quests_completed"
    CITIES_VISITED = "cities_visited"
    ARTIFACTS_COLLECTED = "artifacts_collected"
    CERTIFICATES_ISSUED = "certificates_issued"


class DocumentSourceType(StrEnum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    ARCHAEOLOGICAL = "archaeological"


class NotificationType(StrEnum):
    QUEST_AVAILABLE = "quest_available"
    ACHIEVEMENT_UNLOCKED = "achievement_unlocked"
    ARTIFACT_DISCOVERED = "artifact_discovered"
    CERTIFICATE_READY = "certificate_ready"
    DAILY_QUEST_REFRESHED = "daily_quest_refreshed"
    DAILY_REWARD = "daily_reward"
    CITY_UNLOCKED = "city_unlocked"


class Language(StrEnum):
    KAZAKH = "kk"
    RUSSIAN = "ru"
    ENGLISH = "en"
