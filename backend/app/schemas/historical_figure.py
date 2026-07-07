"""Historical figure schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class HistoricalFigureResponse(BaseSchema):
    id: uuid.UUID
    name: str
    title: str
    description: str
    era: str
    significance: str | None
    image_url: str | None
    city_id: uuid.UUID | None
    sort_order: int
    created_at: datetime


class HistoricalFigureCreateRequest(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    title: str = Field(min_length=1, max_length=255)
    description: str
    era: str = Field(max_length=100)
    significance: str | None = None
    image_url: str | None = None
    city_id: uuid.UUID | None = None
    sort_order: int = Field(default=0, ge=0)
    is_active: bool = True
