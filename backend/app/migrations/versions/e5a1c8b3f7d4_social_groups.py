"""Add social groups ("Ordas") — students form/join groups via an invite code
to compete/cooperate on a shared XP leaderboard.

Revision ID: e5a1c8b3f7d4
Revises: c4d8e1f6a3b9
Create Date: 2026-07-08 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "e5a1c8b3f7d4"
down_revision = "c4d8e1f6a3b9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "groups",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("name", sa.String(100), nullable=False),
        sa.Column("owner_id", sa.UUID(), nullable=False),
        sa.Column("invite_code", sa.String(16), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["owner_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_groups_owner_id", "groups", ["owner_id"])
    op.create_index("ix_groups_invite_code", "groups", ["invite_code"], unique=True)

    op.create_table(
        "user_groups",
        sa.Column("user_id", sa.UUID(), nullable=False),
        sa.Column("group_id", sa.UUID(), nullable=False),
        sa.Column("joined_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["group_id"], ["groups.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("user_id", "group_id"),
    )


def downgrade() -> None:
    op.drop_table("user_groups")
    op.drop_index("ix_groups_invite_code", table_name="groups")
    op.drop_index("ix_groups_owner_id", table_name="groups")
    op.drop_table("groups")
