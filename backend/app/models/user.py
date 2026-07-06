"""User ORM model."""

from datetime import datetime
from typing import TYPE_CHECKING

from sqlalchemy import Boolean, DateTime, Enum, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import Language, UserRole

if TYPE_CHECKING:
    from app.models.achievement import Achievement
    from app.models.certificate import Certificate
    from app.models.chat_history import ChatHistory
    from app.models.progress import Progress
    from app.models.user_cosmetic import UserCosmetic


class User(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Platform user account."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    full_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False),
        default=UserRole.USER,
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    coins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    level: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    streak_days: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_login_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    language: Mapped[Language] = mapped_column(
        Enum(Language, name="user_language", native_enum=False),
        default=Language.KAZAKH,
        nullable=False,
    )
    equipped_frame: Mapped[str] = mapped_column(String(50), default="default", nullable=False)

    progress_records: Mapped[list["Progress"]] = relationship(
        "Progress", back_populates="user", cascade="all, delete-orphan"
    )
    achievements: Mapped[list["Achievement"]] = relationship(
        "Achievement", back_populates="user", cascade="all, delete-orphan"
    )
    chat_messages: Mapped[list["ChatHistory"]] = relationship(
        "ChatHistory", back_populates="user", cascade="all, delete-orphan"
    )
    certificates: Mapped[list["Certificate"]] = relationship(
        "Certificate", back_populates="user", cascade="all, delete-orphan"
    )
    cosmetics: Mapped[list["UserCosmetic"]] = relationship(
        "UserCosmetic", back_populates="user", cascade="all, delete-orphan"
    )
