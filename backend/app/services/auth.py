"""Authentication service."""

import uuid

from app.auth.jwt import create_access_token, create_refresh_token, decode_token, extract_user_id
from app.auth.password import hash_password, verify_password
from app.constants import MIN_PASSWORD_LENGTH
from app.core.unit_of_work import UnitOfWork
from app.enums import UserRole
from app.exceptions import AuthenticationException, ConflictException, ValidationException
from app.models.user import User
from app.schemas.auth import LoginRequest, RegisterRequest, TokenResponse, UserResponse


class AuthService:
    """Handles user registration, login, and token management."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def register(self, data: RegisterRequest) -> TokenResponse:
        if len(data.password) < MIN_PASSWORD_LENGTH:
            raise ValidationException(f"Password must be at least {MIN_PASSWORD_LENGTH} characters")

        if await self._uow.users.email_exists(data.email):
            raise ConflictException("Email already registered")
        if await self._uow.users.username_exists(data.username):
            raise ConflictException("Username already taken")

        user = User(
            email=data.email.lower(),
            username=data.username.lower(),
            hashed_password=hash_password(data.password),
            full_name=data.full_name,
            role=UserRole.USER,
            is_active=True,
        )
        await self._uow.users.create(user)
        return self._build_tokens(user)

    async def login(self, data: LoginRequest) -> TokenResponse:
        user = await self._uow.users.get_by_email(data.email.lower())
        if user is None or not verify_password(data.password, user.hashed_password):
            raise AuthenticationException("Invalid email or password")
        if not user.is_active:
            raise AuthenticationException("Account is deactivated")
        return self._build_tokens(user)

    async def refresh(self, refresh_token: str) -> TokenResponse:
        payload = decode_token(refresh_token)
        if payload.get("type") != "refresh":
            raise AuthenticationException("Invalid refresh token")

        user_id = extract_user_id(payload)
        user = await self._uow.users.get_by_id(user_id)
        if user is None or not user.is_active:
            raise AuthenticationException("User not found or inactive")
        return self._build_tokens(user)

    async def get_current_user_profile(self, user_id: uuid.UUID) -> UserResponse:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise AuthenticationException("User not found")
        return self._to_user_response(user)

    @staticmethod
    def _build_tokens(user: User) -> TokenResponse:
        return TokenResponse(
            access_token=create_access_token(user.id, role=user.role.value),
            refresh_token=create_refresh_token(user.id),
        )

    @staticmethod
    def _to_user_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            bio=user.bio,
            avatar_url=user.avatar_url,
        )
