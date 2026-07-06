"""User cosmetic unlock ORM model."""

import uuid
from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class UserCosmetic(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Records a cosmetic item (e.g. avatar frame) a user has unlocked with coins."""

    __tablename__ = "user_cosmetics"
    __table_args__ = (UniqueConstraint("user_id", "item_key", name="uq_user_cosmetic_item"),)

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    item_key: Mapped[str] = mapped_column(String(50), nullable=False)
    unlocked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="cosmetics")
