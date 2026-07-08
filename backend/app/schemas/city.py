"""City schemas."""

import uuid
from datetime import datetime

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
    sort_order: int
    # None for anonymous requests (no user to evaluate against); True/False once
    # a user's linear-journey progress has been checked.
    is_unlocked: bool | None = None
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
    sort_order: int
    is_unlocked: bool | None = None


class UnlockNextCityResponse(BaseSchema):
    unlocked: bool
    city: CitySummaryResponse | None = None
