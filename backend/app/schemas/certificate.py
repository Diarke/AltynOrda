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
    # None means "use the default title for the user's language" (see CERTIFICATE_TEMPLATES).
    title: str | None = Field(default=None, max_length=255)
