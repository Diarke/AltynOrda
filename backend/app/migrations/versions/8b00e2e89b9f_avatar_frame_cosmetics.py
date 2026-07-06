"""Add avatar frame cosmetics (equipped_frame + user_cosmetics).

Revision ID: 8b00e2e89b9f
Revises: f0c4fd7b1428
Create Date: 2026-07-06 14:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "8b00e2e89b9f"
down_revision = "f0c4fd7b1428"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("equipped_frame", sa.String(length=50), nullable=False, server_default="default"),
    )
    op.create_table(
        "user_cosmetics",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("item_key", sa.String(length=50), nullable=False),
        sa.Column("unlocked_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("user_id", "item_key", name="uq_user_cosmetic_item"),
    )
    op.create_index(
        op.f("ix_user_cosmetics_user_id"), "user_cosmetics", ["user_id"], unique=False
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_user_cosmetics_user_id"), table_name="user_cosmetics")
    op.drop_table("user_cosmetics")
    op.drop_column("users", "equipped_frame")
