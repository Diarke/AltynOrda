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
    created_at: datetime


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
