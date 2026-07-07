"""Public homepage content schema."""

import uuid

from app.enums import Language
from app.schemas.common import BaseSchema


class HomepageContentResponse(BaseSchema):
    id: uuid.UUID
    section: str
    language: Language
    title: str | None
    body: str | None
    image_url: str | None
    cta_text: str | None
    cta_url: str | None
    sort_order: int
