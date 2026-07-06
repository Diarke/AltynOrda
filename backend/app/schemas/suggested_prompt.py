"""Suggested prompt schemas for the AI historian chat widget."""

import uuid
from datetime import datetime

from pydantic import Field

from app.enums import Language
from app.schemas.common import BaseSchema


class SuggestedPromptResponse(BaseSchema):
    id: uuid.UUID
    prompt_text: str
    language: Language
    sort_order: int
    is_active: bool
    created_at: datetime


class AdminSuggestedPromptCreateRequest(BaseSchema):
    prompt_text: str = Field(min_length=1, max_length=500)
    language: Language
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True


class AdminSuggestedPromptUpdateRequest(BaseSchema):
    prompt_text: str | None = Field(default=None, min_length=1, max_length=500)
    language: Language | None = None
    sort_order: int | None = Field(default=None, ge=0)
    is_active: bool | None = None
