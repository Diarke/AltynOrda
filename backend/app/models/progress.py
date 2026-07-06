"""User progress ORM model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, Text, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import ProgressType, QuestStatus

if TYPE_CHECKING:
    from app.models.user import User


class Progress(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Tracks user progress across quests, artifacts, and cities."""

    __tablename__ = "progress"
    __table_args__ = (
        UniqueConstraint("user_id", "entity_type", "entity_id", name="uq_progress_entity"),
    )

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    entity_type: Mapped[ProgressType] = mapped_column(
        Enum(ProgressType, name="progress_type", native_enum=False),
        nullable=False,
    )
    entity_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), index=True, nullable=False)
    status: Mapped[QuestStatus] = mapped_column(
        Enum(QuestStatus, name="progress_quest_status", native_enum=False),
        default=QuestStatus.IN_PROGRESS,
        nullable=False,
    )
    score: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    cooldown_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    user: Mapped["User"] = relationship("User", back_populates="progress_records")
