"""Achievement definition ORM model — the admin-managed achievement catalog."""

from sqlalchemy import Boolean, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin


class AchievementDefinition(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Catalog entry describing an achievement that can be earned automatically.

    ProgressService evaluates `metric >= threshold` against a user's live stats
    (see AchievementMetric) whenever progress changes, and awards an Achievement
    record the first time a definition's condition is met.
    """

    __tablename__ = "achievement_definitions"

    key: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    title_kk: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title_ru: Mapped[str | None] = mapped_column(String(255), nullable=True)
    title_en: Mapped[str | None] = mapped_column(String(255), nullable=True)
    description_kk: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_ru: Mapped[str | None] = mapped_column(Text, nullable=True)
    description_en: Mapped[str | None] = mapped_column(Text, nullable=True)
    icon_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    metric: Mapped[str] = mapped_column(String(50), nullable=False)
    threshold: Mapped[int] = mapped_column(Integer, nullable=False)
    reward_xp: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reward_coins: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
