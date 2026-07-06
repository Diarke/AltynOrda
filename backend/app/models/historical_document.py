"""Historical document ORM model for RAG."""

import uuid
from typing import TYPE_CHECKING

from sqlalchemy import Enum, ForeignKey, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin
from app.enums import DocumentSourceType, Language

if TYPE_CHECKING:
    from app.models.city import City
    from app.models.embedding import DocumentEmbedding


class HistoricalDocument(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Source historical document for RAG retrieval."""

    __tablename__ = "historical_documents"

    city_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("cities.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    title: Mapped[str] = mapped_column(String(500), nullable=False, index=True)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    source: Mapped[str] = mapped_column(String(255), nullable=False)
    source_type: Mapped[DocumentSourceType] = mapped_column(
        Enum(DocumentSourceType, name="document_source_type", native_enum=False),
        default=DocumentSourceType.SECONDARY,
        nullable=False,
    )
    author: Mapped[str | None] = mapped_column(String(255), nullable=True)
    year: Mapped[str | None] = mapped_column(String(50), nullable=True)
    language: Mapped[Language] = mapped_column(
        Enum(Language, name="historical_document_language", native_enum=False),
        nullable=False,
    )
    # Ties together translated variants of the same source document across languages.
    group_key: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), nullable=True, index=True
    )

    city: Mapped["City | None"] = relationship("City", back_populates="documents")
    embeddings: Mapped[list["DocumentEmbedding"]] = relationship(
        "DocumentEmbedding", back_populates="document", cascade="all, delete-orphan"
    )
