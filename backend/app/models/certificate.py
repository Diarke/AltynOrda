"""Certificate ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, Integer, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Certificate(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Completion certificate issued to a user."""

    __tablename__ = "certificates"

    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    title: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str] = mapped_column(Text, nullable=False)
    completion_percent: Mapped[int] = mapped_column(Integer, nullable=False)
    certificate_code: Mapped[str] = mapped_column(
        String(64), unique=True, index=True, nullable=False
    )
    issued_at: Mapped[str] = mapped_column(String(50), nullable=False)

    user: Mapped["User"] = relationship("User", back_populates="certificates")
