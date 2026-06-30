"""Artifact ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.city import City


class Artifact(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Collectible historical artifact."""

    __tablename__ = "artifacts"

    city_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    era: Mapped[str] = mapped_column(String(100), nullable=False)
    rarity: Mapped[str] = mapped_column(String(50), default="common", nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    historical_context: Mapped[str | None] = mapped_column(Text, nullable=True)

    city: Mapped["City"] = relationship("City", back_populates="artifacts")
