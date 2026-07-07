"""Split City/Artifact/Quest/AchievementDefinition free-text columns into
`_kk`/`_ru`/`_en` suffixed columns (existing content is English-only —
backfilled into `_en`; `_kk`/`_ru` are filled in later by seed data / admin).

Revision ID: a4f7c9e1b3d2
Revises: d2e8a4c9f1b6
Create Date: 2026-07-08 10:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "a4f7c9e1b3d2"
down_revision = "d2e8a4c9f1b6"
branch_labels = None
depends_on = None

LANGS = ("kk", "ru", "en")

# table -> [(column_name, sqlalchemy type)]
LOCALIZED_COLUMNS: dict[str, list[tuple[str, sa.types.TypeEngine]]] = {
    "cities": [
        ("name", sa.String(length=255)),
        ("description", sa.Text()),
        ("historical_period", sa.String(length=100)),
        ("population_estimate", sa.String(length=100)),
        ("significance", sa.Text()),
        ("historical_facts", sa.JSON()),
        ("trade_info", sa.Text()),
    ],
    "artifacts": [
        ("name", sa.String(length=255)),
        ("description", sa.Text()),
        ("era", sa.String(length=100)),
        ("historical_context", sa.Text()),
    ],
    "quests": [
        ("title", sa.String(length=255)),
        ("description", sa.Text()),
    ],
    "achievement_definitions": [
        ("title", sa.String(length=255)),
        ("description", sa.Text()),
    ],
}


def upgrade() -> None:
    for table, columns in LOCALIZED_COLUMNS.items():
        for column, col_type in columns:
            for lang in LANGS:
                op.add_column(table, sa.Column(f"{column}_{lang}", col_type, nullable=True))
            # Existing content is English — seed data / admin fill in kk/ru afterward.
            op.execute(f'UPDATE {table} SET {column}_en = "{column}"')

    # cities.name/artifacts.name/quests.title were indexed (cities.name uniquely);
    # that indexing moves to the Kazakh (default-language) column.
    op.drop_index("ix_cities_name", table_name="cities")
    op.create_index(op.f("ix_cities_name_kk"), "cities", ["name_kk"], unique=True)
    op.drop_index("ix_artifacts_name", table_name="artifacts")
    op.create_index(op.f("ix_artifacts_name_kk"), "artifacts", ["name_kk"], unique=False)
    op.drop_index("ix_quests_title", table_name="quests")
    op.create_index(op.f("ix_quests_title_kk"), "quests", ["title_kk"], unique=False)

    for table, columns in LOCALIZED_COLUMNS.items():
        for column, _ in columns:
            op.drop_column(table, column)

    # `_kk`/`_ru` are left nullable at the DB level (they're empty until the seed/
    # backfill script runs); required-ness for new writes is enforced at the
    # Pydantic layer instead. `_en` is guaranteed non-empty since it was just
    # backfilled from the old single-language column above.


def downgrade() -> None:
    for table, columns in LOCALIZED_COLUMNS.items():
        for column, col_type in columns:
            op.add_column(table, sa.Column(column, col_type, nullable=True))
            op.execute(f'UPDATE {table} SET "{column}" = COALESCE({column}_en, {column}_kk, {column}_ru)')

    op.drop_index(op.f("ix_cities_name_kk"), table_name="cities")
    op.create_index("ix_cities_name", "cities", ["name"], unique=True)
    op.drop_index(op.f("ix_artifacts_name_kk"), table_name="artifacts")
    op.create_index("ix_artifacts_name", "artifacts", ["name"], unique=False)
    op.drop_index(op.f("ix_quests_title_kk"), table_name="quests")
    op.create_index("ix_quests_title", "quests", ["title"], unique=False)

    for table, columns in LOCALIZED_COLUMNS.items():
        for column, _ in columns:
            for lang in LANGS:
                op.drop_column(table, f"{column}_{lang}")

    op.alter_column("cities", "name", nullable=False)
    op.alter_column("cities", "description", nullable=False)
    op.alter_column("cities", "historical_period", nullable=False)
    op.alter_column("artifacts", "name", nullable=False)
    op.alter_column("artifacts", "description", nullable=False)
    op.alter_column("artifacts", "era", nullable=False)
    op.alter_column("quests", "title", nullable=False)
    op.alter_column("quests", "description", nullable=False)
    op.alter_column("achievement_definitions", "title", nullable=False)
    op.alter_column("achievement_definitions", "description", nullable=False)

