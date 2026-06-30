"""Authentication schemas."""

import uuid

from pydantic import EmailStr, Field

from app.constants import MIN_PASSWORD_LENGTH
from app.enums import UserRole
from app.schemas.common import BaseSchema


class RegisterRequest(BaseSchema):
    email: EmailStr
    username: str = Field(min_length=3, max_length=100)
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)
    full_name: str | None = Field(default=None, max_length=255)


class LoginRequest(BaseSchema):
    email: EmailStr
    password: str = Field(min_length=MIN_PASSWORD_LENGTH, max_length=128)


class RefreshTokenRequest(BaseSchema):
    refresh_token: str


class TokenResponse(BaseSchema):
    access_token: str
    refresh_token: str
    token_type: str = "bearer"


class UserResponse(BaseSchema):
    id: uuid.UUID
    email: str
    username: str
    full_name: str | None
    role: UserRole
    is_active: bool
    bio: str | None = None


class UserUpdateRequest(BaseSchema):
    full_name: str | None = Field(default=None, max_length=255)
    bio: str | None = Field(default=None, max_length=1000)
