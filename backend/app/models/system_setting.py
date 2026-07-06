"""System setting model for admin-managed infrastructure flags."""

from sqlalchemy import String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class SystemSetting(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Key/value store for system configuration."""

    __tablename__ = "system_settings"

    key: Mapped[str] = mapped_column(String(100), nullable=False, unique=True, index=True)
    value: Mapped[str] = mapped_column(Text, nullable=False)
