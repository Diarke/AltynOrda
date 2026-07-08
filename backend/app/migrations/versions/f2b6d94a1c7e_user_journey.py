"""Add `journey` to users — the Merchant/Diplomat/Explorer path chosen at
onboarding, persisted so the frontend shows the right selection after a
refresh instead of silently resetting to a local default.

Revision ID: f2b6d94a1c7e
Revises: e5a1c8b3f7d4
Create Date: 2026-07-09 09:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "f2b6d94a1c7e"
down_revision = "e5a1c8b3f7d4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("journey", sa.String(20), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "journey")
