"""Achievement ORM model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.achievement_definition import AchievementDefinition
    from app.models.user import User


class Achievement(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """User achievement badge — an earned instance of an AchievementDefinition."""

    __tablename__ = "achievements"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    # Freeform slug, not a fixed Python enum — the catalog of possible achievements
    # lives in AchievementDefinition and is entirely admin-editable.
    achievement_type: Mapped[str] = mapped_column(String(50), nullable=False)
    definition_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("achievement_definitions.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    reward_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reward_coins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    achieved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="achievements")
    definition: Mapped["AchievementDefinition | None"] = relationship("AchievementDefinition")
