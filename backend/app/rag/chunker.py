"""Document chunking for RAG pipeline."""

from langchain_text_splitters import RecursiveCharacterTextSplitter

from app.config import get_settings


class DocumentChunker:
    """Split historical documents into overlapping chunks."""

    def __init__(self) -> None:
        settings = get_settings()
        self._splitter = RecursiveCharacterTextSplitter(
            chunk_size=settings.rag_chunk_size,
            chunk_overlap=settings.rag_chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", ". ", " ", ""],
        )

    def chunk(self, text: str) -> list[str]:
        """Split text into chunks."""
        return self._splitter.split_text(text)
