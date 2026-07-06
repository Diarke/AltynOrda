"""Gallery image model for admin-managed content."""

import uuid

from sqlalchemy import Boolean, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import Language


class GalleryImage(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Image displayed in the application gallery."""

    __tablename__ = "gallery_images"

    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    language: Mapped[Language] = mapped_column(
        Enum(Language, name="gallery_image_language", native_enum=False),
        nullable=False,
    )
    # Ties together the per-language caption variants of the same underlying image.
    group_key: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    image_url: Mapped[str] = mapped_column(String(500), nullable=False)
    alt_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
