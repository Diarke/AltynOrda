"""Notification schemas."""

import uuid
from datetime import datetime

from app.schemas.common import BaseSchema


class NotificationResponse(BaseSchema):
    id: uuid.UUID
    type: str
    title: str
    message: str
    entity_type: str | None
    entity_id: uuid.UUID | None
    is_read: bool
    created_at: datetime


class UnreadCountResponse(BaseSchema):
    unread_count: int
