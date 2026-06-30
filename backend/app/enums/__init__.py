"""Application-wide enumerations."""

from enum import StrEnum


class UserRole(StrEnum):
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


class DocumentSourceType(StrEnum):
    PRIMARY = "primary"
    SECONDARY = "secondary"
    ARCHAEOLOGICAL = "archaeological"
