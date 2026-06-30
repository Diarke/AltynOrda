"""Certificate schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class CertificateResponse(BaseSchema):
    id: uuid.UUID
    user_id: uuid.UUID
    title: str
    description: str
    completion_percent: int
    certificate_code: str
    issued_at: str
    created_at: datetime


class CertificateCreateRequest(BaseSchema):
    title: str = Field(default="ORDA Historical Journey Certificate", max_length=255)
