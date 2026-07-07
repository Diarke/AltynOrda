"""Add nullable `params` JSON column to notifications, storing the template
kwargs used at creation time so a notification can be re-rendered live if the
recipient later switches language.

Revision ID: b7c3f9a2d4e1
Revises: a4f7c9e1b3d2
Create Date: 2026-07-07 12:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "b7c3f9a2d4e1"
down_revision = "a4f7c9e1b3d2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("notifications", sa.Column("params", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("notifications", "params")
