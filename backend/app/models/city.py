"""City ORM model."""

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.artifact import Artifact
    from app.models.gallery_image import GalleryImage
    from app.models.historical_document import HistoricalDocument
    from app.models.quest import Quest


class City(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Historical city of the Golden Horde."""

    __tablename__ = "cities"

    name: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    historical_period: Mapped[str] = mapped_column(String(100), nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    population_estimate: Mapped[str | None] = mapped_column(String(100), nullable=True)
    significance: Mapped[str | None] = mapped_column(Text, nullable=True)
    historical_facts: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    trade_info: Mapped[str | None] = mapped_column(Text, nullable=True)

    artifacts: Mapped[list["Artifact"]] = relationship(
        "Artifact", back_populates="city", cascade="all, delete-orphan"
    )
    quests: Mapped[list["Quest"]] = relationship(
        "Quest", back_populates="city", cascade="all, delete-orphan"
    )
    documents: Mapped[list["HistoricalDocument"]] = relationship(
        "HistoricalDocument", back_populates="city", cascade="all, delete-orphan"
    )
    gallery_images: Mapped[list["GalleryImage"]] = relationship(
        "GalleryImage", back_populates="city", cascade="all, delete-orphan"
    )
