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
    rarity: Mapped[str] = mapped_column(String(50), default="common", nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    name_kk: Mapped[str | None] = mapped_column(String(255), index=True, nullable=True)
    name_ru: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description_kk: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    era_kk: Mapped[str | None] = mapped_column(String(100), nullable=True)
    era_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    era_en: Mapped[str | None] = mapped_column(String(100), nullable=True)
    historical_context_kk: Mapped[str | None] = mapped_column(Text, nullable=True)
    historical_context_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    historical_context_en: Mapped[str | None] = mapped_column(Text, nullable=True)

    city: Mapped["City"] = relationship("City", back_populates="artifacts")
