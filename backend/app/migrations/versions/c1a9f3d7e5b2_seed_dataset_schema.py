"""City facts/trade info, per-city galleries, and a DB-driven achievement catalog.

Revision ID: c1a9f3d7e5b2
Revises: 54ddeb852587
Create Date: 2026-07-07 09:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "c1a9f3d7e5b2"
down_revision = "54ddeb852587"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("cities", sa.Column("historical_facts", sa.JSON(), nullable=True))
    op.add_column("cities", sa.Column("trade_info", sa.Text(), nullable=True))

    op.add_column("gallery_images", sa.Column("city_id", sa.UUID(), nullable=True))
    op.create_index(
        op.f("ix_gallery_images_city_id"), "gallery_images", ["city_id"], unique=False
    )
    op.create_foreign_key(
        "fk_gallery_images_city_id_cities",
        "gallery_images",
        "cities",
        ["city_id"],
        ["id"],
        ondelete="CASCADE",
    )

    op.create_table(
        "achievement_definitions",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("key", sa.String(length=100), nullable=False),
        sa.Column("title", sa.String(length=255), nullable=False),
        sa.Column("description", sa.Text(), nullable=False),
        sa.Column("icon_url", sa.String(length=500), nullable=True),
        sa.Column("metric", sa.String(length=50), nullable=False),
        sa.Column("threshold", sa.Integer(), nullable=False),
        sa.Column("reward_xp", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("reward_coins", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_achievement_definitions_key"), "achievement_definitions", ["key"], unique=True
    )

    op.add_column("achievements", sa.Column("definition_id", sa.UUID(), nullable=True))
    op.create_index(
        op.f("ix_achievements_definition_id"), "achievements", ["definition_id"], unique=False
    )
    op.create_foreign_key(
        "fk_achievements_definition_id_achievement_definitions",
        "achievements",
        "achievement_definitions",
        ["definition_id"],
        ["id"],
        ondelete="SET NULL",
    )


def downgrade() -> None:
    op.drop_constraint(
        "fk_achievements_definition_id_achievement_definitions",
        "achievements",
        type_="foreignkey",
    )
    op.drop_index(op.f("ix_achievements_definition_id"), table_name="achievements")
    op.drop_column("achievements", "definition_id")

    op.drop_index(op.f("ix_achievement_definitions_key"), table_name="achievement_definitions")
    op.drop_table("achievement_definitions")

    op.drop_constraint(
        "fk_gallery_images_city_id_cities", "gallery_images", type_="foreignkey"
    )
    op.drop_index(op.f("ix_gallery_images_city_id"), table_name="gallery_images")
    op.drop_column("gallery_images", "city_id")

    op.drop_column("cities", "trade_info")
    op.drop_column("cities", "historical_facts")
