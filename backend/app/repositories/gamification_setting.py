"""Gamification setting repository."""

from app.models.gamification_setting import GamificationSetting
from app.repositories.base import BaseRepository


class GamificationSettingRepository(BaseRepository[GamificationSetting]):
    model = GamificationSetting
