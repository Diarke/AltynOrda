"""Quest ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import QuestStatus

if TYPE_CHECKING:
    from app.models.city import City


class Quest(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Interactive historical quest."""

    __tablename__ = "quests"

    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    difficulty: Mapped[str] = mapped_column(String(50), default="medium", nullable=False)
    points: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    xp_reward: Mapped[int] = mapped_column(Integer, default=100, nullable=False)
    coin_reward: Mapped[int] = mapped_column(Integer, default=10, nullable=False)
    cooldown_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    estimated_time_minutes: Mapped[int] = mapped_column(Integer, default=15, nullable=False)
    category: Mapped[str] = mapped_column(String(50), default="exploration", nullable=False)
    status: Mapped[QuestStatus] = mapped_column(
        Enum(QuestStatus, name="quest_status", native_enum=False),
        default=QuestStatus.NOT_STARTED,
        nullable=False,
    )
    quiz_questions: Mapped[str | None] = mapped_column(Text, nullable=True)

    city: Mapped["City"] = relationship("City", back_populates="quests")
