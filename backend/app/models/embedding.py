"""Document embedding ORM model with pgvector support."""

import uuid
from typing import TYPE_CHECKING

from pgvector.sqlalchemy import Vector
from sqlalchemy import ForeignKey, Integer, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base, TimestampMixin, UUIDPrimaryKeyMixin

if TYPE_CHECKING:
    from app.models.historical_document import HistoricalDocument

EMBEDDING_DIMENSION = 768


class DocumentEmbedding(Base, UUIDPrimaryKeyMixin, TimestampMixin):
    """Vector embedding chunk for a historical document."""

    __tablename__ = "document_embeddings"

    document_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True),
        ForeignKey("historical_documents.id", ondelete="CASCADE"),
        index=True,
        nullable=False,
    )
    chunk_index: Mapped[int] = mapped_column(Integer, nullable=False)
    chunk_text: Mapped[str] = mapped_column(Text, nullable=False)
    embedding: Mapped[list[float]] = mapped_column(Vector(EMBEDDING_DIMENSION), nullable=False)

    document: Mapped["HistoricalDocument"] = relationship(
        "HistoricalDocument", back_populates="embeddings"
    )
