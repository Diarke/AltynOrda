"""Plain-text extraction from uploaded knowledge-base files (PDF/DOCX/TXT/Markdown)."""

import io

from app.exceptions import ValidationException

SUPPORTED_EXTENSIONS = {".pdf", ".docx", ".txt", ".md", ".markdown"}


def extract_text(filename: str, content: bytes) -> str:
    """Extract plain text from an uploaded file based on its extension."""
    lower = filename.lower()

    if lower.endswith(".pdf"):
        text = _extract_pdf(content)
    elif lower.endswith(".docx"):
        text = _extract_docx(content)
    elif lower.endswith((".txt", ".md", ".markdown")):
        text = _extract_plain_text(content)
    else:
        raise ValidationException(
            "Unsupported file type. Upload a PDF, DOCX, TXT, or Markdown file."
        )

    text = text.strip()
    if not text:
        raise ValidationException("No extractable text was found in this file.")
    return text


def _extract_pdf(content: bytes) -> str:
    from pypdf import PdfReader

    try:
        reader = PdfReader(io.BytesIO(content))
        pages = [page.extract_text() or "" for page in reader.pages]
    except Exception as exc:  # noqa: BLE001 - surface as a clean validation error
        raise ValidationException("Could not read this PDF file.") from exc
    return "\n\n".join(pages)


def _extract_docx(content: bytes) -> str:
    from docx import Document

    try:
        document = Document(io.BytesIO(content))
        paragraphs = [p.text for p in document.paragraphs]
    except Exception as exc:  # noqa: BLE001
        raise ValidationException("Could not read this DOCX file.") from exc
    return "\n".join(paragraphs)


def _extract_plain_text(content: bytes) -> str:
    for encoding in ("utf-8", "utf-16", "latin-1"):
        try:
            return content.decode(encoding)
        except UnicodeDecodeError:
            continue
    raise ValidationException("Could not decode this file as text.")
