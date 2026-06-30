"""AI request/response schemas."""

from pydantic import Field

from app.schemas.common import BaseSchema


class AIChatMessage(BaseSchema):
    role: str
    content: str


class AICompletionRequest(BaseSchema):
    messages: list[AIChatMessage]
    system_prompt: str | None = None
    temperature: float | None = None
    max_tokens: int | None = None


class AICompletionResponse(BaseSchema):
    content: str
    model: str
    tokens_used: int | None = None


class EmbeddingRequest(BaseSchema):
    text: str = Field(min_length=1, max_length=8000)


class EmbeddingResponse(BaseSchema):
    embedding: list[float]
    model: str
    dimensions: int
