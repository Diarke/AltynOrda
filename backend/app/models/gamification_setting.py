"""Gamification setting model for admin-managed game rules."""

from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class GamificationSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Key/value store for gamification configuration."""

    __tablename__ = "gamification_settings"

    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    value: Mapped[str] = mapped_column(String(500), nullable=False)
