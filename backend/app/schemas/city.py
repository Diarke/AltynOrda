"""City schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class CityResponse(BaseSchema):
    id: uuid.UUID
    name: str
    slug: str
    description: str
    historical_period: str
    latitude: float
    longitude: float
    image_url: str | None
    population_estimate: str | None
    significance: str | None
    historical_facts: list[str] | None
    trade_info: str | None
    created_at: datetime


class CityGalleryImageResponse(BaseSchema):
    id: uuid.UUID
    title: str | None
    description: str | None
    image_url: str
    alt_text: str | None
    sort_order: int


class CitySummaryResponse(BaseSchema):
    id: uuid.UUID
    name: str
    slug: str
    historical_period: str
    latitude: float
    longitude: float
    image_url: str | None


class CityCreateRequest(BaseSchema):
    name: str = Field(min_length=1, max_length=255)
    slug: str = Field(min_length=1, max_length=255)
    description: str
    historical_period: str = Field(max_length=100)
    latitude: float
    longitude: float
    image_url: str | None = None
    population_estimate: str | None = None
    significance: str | None = None
    historical_facts: list[str] | None = None
    trade_info: str | None = None
