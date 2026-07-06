"""Add progression, cooldown, streak, and achievement rewards to the gamification system.

Revision ID: 8f21d0d3f2b1
Revises: 30b03601290c
Create Date: 2026-07-06 00:15:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "8f21d0d3f2b1"
down_revision = "a0a82f9de2ad"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("xp", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("coins", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("users", sa.Column("level", sa.Integer(), nullable=False, server_default="1"))
    op.add_column("users", sa.Column("streak_days", sa.Integer(), nullable=False, server_default="0"))
    op.add_column(
        "users",
        sa.Column("last_login_at", sa.DateTime(timezone=True), nullable=True),
    )

    op.add_column("quests", sa.Column("xp_reward", sa.Integer(), nullable=False, server_default="100"))
    op.add_column("quests", sa.Column("coin_reward", sa.Integer(), nullable=False, server_default="10"))
    op.add_column("quests", sa.Column("cooldown_hours", sa.Integer(), nullable=False, server_default="24"))
    op.add_column(
        "quests",
        sa.Column("estimated_time_minutes", sa.Integer(), nullable=False, server_default="15"),
    )
    op.add_column("quests", sa.Column("category", sa.String(length=50), nullable=False, server_default="exploration"))

    op.add_column("progress", sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("progress", sa.Column("cooldown_until", sa.DateTime(timezone=True), nullable=True))

    op.add_column("achievements", sa.Column("reward_xp", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("achievements", sa.Column("reward_coins", sa.Integer(), nullable=False, server_default="0"))
    op.add_column("achievements", sa.Column("achieved_at", sa.DateTime(timezone=True), nullable=True))

    # achievement_type is stored as a plain VARCHAR (native_enum=False), not a Postgres
    # enum type, so new members don't need ALTER TYPE — just a wide enough column.
    # It was previously narrowed to VARCHAR(13) in 30b03601290c; the new values
    # (e.g. "master_of_the_steppe", 20 chars) no longer fit, so widen it.
    op.alter_column(
        "achievements",
        "achievement_type",
        existing_type=sa.VARCHAR(length=13),
        type_=sa.String(length=50),
        existing_nullable=False,
    )


def downgrade() -> None:
    op.alter_column(
        "achievements",
        "achievement_type",
        existing_type=sa.String(length=50),
        type_=sa.VARCHAR(length=13),
        existing_nullable=False,
    )
    op.drop_column("achievements", "achieved_at")
    op.drop_column("achievements", "reward_coins")
    op.drop_column("achievements", "reward_xp")
    op.drop_column("progress", "cooldown_until")
    op.drop_column("progress", "completed_at")
    op.drop_column("quests", "category")
    op.drop_column("quests", "estimated_time_minutes")
    op.drop_column("quests", "cooldown_hours")
    op.drop_column("quests", "coin_reward")
    op.drop_column("quests", "xp_reward")
    op.drop_column("users", "last_login_at")
    op.drop_column("users", "streak_days")
    op.drop_column("users", "level")
    op.drop_column("users", "coins")
    op.drop_column("users", "xp")
