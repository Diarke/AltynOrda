"""ORM models package – import all models for Alembic discovery."""

from app.models.achievement import Achievement
from app.models.achievement_definition import AchievementDefinition
from app.models.artifact import Artifact
from app.models.certificate import Certificate
from app.models.chat_history import ChatHistory
from app.models.city import City
from app.models.embedding import EMBEDDING_DIMENSION, DocumentEmbedding
from app.models.gallery_image import GalleryImage
from app.models.gamification_setting import GamificationSetting
from app.models.group import Group
from app.models.group_membership import GroupMembership
from app.models.historical_document import HistoricalDocument
from app.models.historical_figure import HistoricalFigure
from app.models.homepage_content import HomepageContent
from app.models.notification import Notification
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.suggested_prompt import SuggestedPrompt
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.models.user_cosmetic import UserCosmetic

__all__ = [
    "Achievement",
    "AchievementDefinition",
    "Artifact",
    "Certificate",
    "ChatHistory",
    "City",
    "DocumentEmbedding",
    "EMBEDDING_DIMENSION",
    "GamificationSetting",
    "GalleryImage",
    "Group",
    "GroupMembership",
    "HistoricalDocument",
    "HistoricalFigure",
    "HomepageContent",
    "Notification",
    "Progress",
    "Quest",
    "SuggestedPrompt",
    "SystemSetting",
    "User",
    "UserCosmetic",
]
