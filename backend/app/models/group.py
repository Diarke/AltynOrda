"""Group ("Orda") ORM model."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.user import User


class Group(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """A social group ("Orda") students create to compete/cooperate in."""

    __tablename__ = "groups"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    owner_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    invite_code: Mapped[str] = mapped_column(String(16), unique=True, index=True, nullable=False)

    owner: Mapped["User"] = relationship("User", back_populates="owned_groups")
