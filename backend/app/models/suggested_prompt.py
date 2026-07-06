"""Suggested prompt model for the AI historian chat widget."""

from sqlalchemy import Boolean, Enum, Integer, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import Language


class SuggestedPrompt(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Admin-curated quick-start prompt shown to AI historian chat users."""

    __tablename__ = "suggested_prompts"

    prompt_text: Mapped[str] = mapped_column(Text, nullable=False)
    language: Mapped[Language] = mapped_column(
        Enum(Language, name="suggested_prompt_language", native_enum=False),
        nullable=False,
    )
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
