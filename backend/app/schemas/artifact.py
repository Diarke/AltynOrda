"""Artifact schemas."""

import uuid
from datetime import datetime

from app.schemas.common import BaseSchema


class ArtifactResponse(BaseSchema):
    id: uuid.UUID
    city_id: uuid.UUID
    name: str
    description: str
    era: str
    rarity: str
    image_url: str | None
    historical_context: str | None
    created_at: datetime
