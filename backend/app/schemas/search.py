"""Global search schemas."""

import uuid

from app.schemas.common import BaseSchema


class SearchResultItem(BaseSchema):
    id: uuid.UUID
    type: str
    title: str
    subtitle: str | None = None
    city_id: uuid.UUID | None = None


class GlobalSearchResponse(BaseSchema):
    cities: list[SearchResultItem]
    artifacts: list[SearchResultItem]
    quests: list[SearchResultItem]
    historical_figures: list[SearchResultItem]
    suggested_prompts: list[SearchResultItem]
