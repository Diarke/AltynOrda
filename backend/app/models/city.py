"""City ORM model."""

from typing import TYPE_CHECKING

from sqlalchemy import JSON, Float, Integer, String, Text
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

    slug: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    # Position in the linear historical-journey sequence — lower opens first.
    # Admin-editable; defaults to 0 (unordered) until explicitly set.
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    name_kk: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
    name_ru: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description_kk: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    historical_period_kk: Mapped[str | None] = mapped_column(String(100), nullable=True)
    historical_period_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    historical_period_en: Mapped[str | None] = mapped_column(String(100), nullable=True)
    population_estimate_kk: Mapped[str | None] = mapped_column(String(100), nullable=True)
    population_estimate_ru: Mapped[str | None] = mapped_column(String(100), nullable=True)
    population_estimate_en: Mapped[str | None] = mapped_column(String(100), nullable=True)
    significance_kk: Mapped[str | None] = mapped_column(Text, nullable=True)
    significance_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    significance_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    historical_facts_kk: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    historical_facts_ru: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    historical_facts_en: Mapped[list[str] | None] = mapped_column(JSON, nullable=True)
    trade_info_kk: Mapped[str | None] = mapped_column(Text, nullable=True)
    trade_info_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    trade_info_en: Mapped[str | None] = mapped_column(Text, nullable=True)

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
