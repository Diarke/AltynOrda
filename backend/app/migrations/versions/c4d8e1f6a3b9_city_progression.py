"""Add `sort_order` to cities for the linear historical-journey progression, and
backfill a sensible default order for the seeded cities.

Revision ID: c4d8e1f6a3b9
Revises: b7c3f9a2d4e1
Create Date: 2026-07-09 09:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "c4d8e1f6a3b9"
down_revision = "b7c3f9a2d4e1"
branch_labels = None
depends_on = None

# Sarai-Batu (the Horde's founding capital) opens first; the rest follow a
# loose historical/geographic arc east then west. Purely a default — admin
# editable, not load-bearing for correctness.
SORT_ORDER_BY_SLUG = {
    "sarai-batu": 0,
    "bolgar": 1,
    "sarayshyk": 2,
    "otrar": 3,
    "sygnak": 4,
    "crimea": 5,
}


def upgrade() -> None:
    op.add_column("cities", sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"))
    op.alter_column("cities", "sort_order", server_default=None)

    cities = sa.table("cities", sa.column("slug", sa.String), sa.column("sort_order", sa.Integer))
    for slug, order in SORT_ORDER_BY_SLUG.items():
        op.execute(cities.update().where(cities.c.slug == slug).values(sort_order=order))


def downgrade() -> None:
    op.drop_column("cities", "sort_order")
