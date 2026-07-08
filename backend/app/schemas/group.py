"""Group ("Orda") schemas."""

import uuid
from datetime import datetime

from pydantic import Field

from app.schemas.common import BaseSchema


class GroupResponse(BaseSchema):
    id: uuid.UUID
    name: str
    owner_id: uuid.UUID
    invite_code: str
    member_count: int
    created_at: datetime


class GroupCreateRequest(BaseSchema):
    name: str = Field(min_length=2, max_length=100)


class GroupJoinRequest(BaseSchema):
    invite_code: str = Field(min_length=1, max_length=16)


class GroupMemberResponse(BaseSchema):
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    level: int
    xp: int
    is_owner: bool
    joined_at: datetime


class LeaderboardEntryResponse(BaseSchema):
    rank: int
    user_id: uuid.UUID
    username: str
    avatar_url: str | None
    level: int
    xp: int
    coins: int
    completed_quests: int
