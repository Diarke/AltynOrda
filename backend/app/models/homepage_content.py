"""Homepage content model for admin-managed landing page blocks."""

import uuid

from sqlalchemy import Boolean, Enum, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import Language


class HomepageContent(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Reusable homepage content block."""

    __tablename__ = "homepage_content"

    section: Mapped[str] = mapped_column(String(100), nullable=False, index=True)
    language: Mapped[Language] = mapped_column(
        Enum(Language, name="homepage_content_language", native_enum=False),
        nullable=False,
    )
    # Ties together the per-language variants of the same logical content block;
    # generated once and reused when an admin adds a translation of an existing block.
    group_key: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )
    title: Mapped[str | None] = mapped_column(String(255), nullable=True)
    body: Mapped[str | None] = mapped_column(Text, nullable=True)
    image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    cta_text: Mapped[str | None] = mapped_column(String(255), nullable=True)
    cta_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
