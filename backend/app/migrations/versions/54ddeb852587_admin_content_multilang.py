"""Multi-language admin content, suggested prompts, wider system setting values.

Revision ID: 54ddeb852587
Revises: 8b00e2e89b9f
Create Date: 2026-07-06 16:00:00.000000
"""

import sqlalchemy as sa
from alembic import op

revision = "54ddeb852587"
down_revision = "8b00e2e89b9f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Widen system_settings.value to hold long-form text (e.g. the AI system prompt).
    op.alter_column(
        "system_settings",
        "value",
        existing_type=sa.String(length=500),
        type_=sa.Text(),
        existing_nullable=False,
    )

    # Per-language content variants. Stored as plain VARCHAR (native_enum=False);
    # SQLAlchemy writes the Python enum member's NAME ("KAZAKH"/"RUSSIAN"/"ENGLISH"),
    # not its value ("kk"/"ru"/"en") — same convention as users.language.
    for table in ("homepage_content", "gallery_images", "historical_documents"):
        op.add_column(
            table,
            sa.Column("language", sa.String(length=7), nullable=False, server_default="KAZAKH"),
        )
        op.add_column(table, sa.Column("group_key", sa.UUID(), nullable=True))
        op.create_index(op.f(f"ix_{table}_group_key"), table, ["group_key"], unique=False)

    op.create_table(
        "suggested_prompts",
        sa.Column("id", sa.UUID(), nullable=False),
        sa.Column("prompt_text", sa.Text(), nullable=False),
        sa.Column("language", sa.String(length=7), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )

    # Supporting indexes for the new admin analytics time-series queries.
    op.create_index(op.f("ix_users_created_at"), "users", ["created_at"], unique=False)
    op.create_index(op.f("ix_progress_created_at"), "progress", ["created_at"], unique=False)
    op.create_index(op.f("ix_chat_history_created_at"), "chat_history", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_chat_history_created_at"), table_name="chat_history")
    op.drop_index(op.f("ix_progress_created_at"), table_name="progress")
    op.drop_index(op.f("ix_users_created_at"), table_name="users")

    op.drop_table("suggested_prompts")

    for table in ("homepage_content", "gallery_images", "historical_documents"):
        op.drop_index(op.f(f"ix_{table}_group_key"), table_name=table)
        op.drop_column(table, "group_key")
        op.drop_column(table, "language")

    op.alter_column(
        "system_settings",
        "value",
        existing_type=sa.Text(),
        type_=sa.String(length=500),
        existing_nullable=False,
    )
