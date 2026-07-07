"""Chat schemas."""

import uuid

from pydantic import Field

from app.enums import Language
from app.schemas.common import BaseSchema


class ChatRequest(BaseSchema):
    message: str = Field(min_length=1, max_length=4000)
    city_id: uuid.UUID | None = None
    # The frontend's current UI language — preferred over the account's stored
    # profile language, since a user can switch languages without updating their profile.
    language: Language | None = None


class ChatSource(BaseSchema):
    document_title: str
    chunk_text: str
    similarity: float


class ChatResponse(BaseSchema):
    answer: str
    sources: list[ChatSource]
    verified: bool


class ChatMessageResponse(BaseSchema):
    role: str
    content: str
    city_id: uuid.UUID | None = None
