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


class AchievementType(StrEnum):
    EXPLORER = "explorer"
    SCHOLAR = "scholar"
    COLLECTOR = "collector"
    COMPLETIONIST = "completionist"
    HISTORIAN = "historian"
    MERCHANT = "merchant"
    ARCHAEOLOGIST = "archaeologist"
    MASTER_OF_THE_STEPPE = "master_of_the_steppe"
    AI_SCHOLAR = "ai_scholar"


class DocumentSourceType(StrEnum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    ARCHAEOLOGICAL = "archaeological"


class Language(StrEnum):
    KAZAKH = "kk"
    RUSSIAN = "ru"
    ENGLISH = "en"
