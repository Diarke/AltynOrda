"""Add language preference to users.

Revision ID: f0c4fd7b1428
Revises: 8f21d0d3f2b1
Create Date: 2026-07-06 12:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f0c4fd7b1428"
down_revision = "8f21d0d3f2b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Stored as a plain VARCHAR (native_enum=False); SQLAlchemy writes the Python
    # enum member's NAME ("KAZAKH"/"RUSSIAN"/"ENGLISH"), not its value ("kk"/"ru"/"en").
    op.add_column(
        "users",
        sa.Column("language", sa.String(length=7), nullable=False, server_default="KAZAKH"),
    )


def downgrade() -> None:
    op.drop_column("users", "language")
