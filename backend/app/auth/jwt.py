"""JWT token creation and validation."""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

import jwt

from app.config import get_settings
from app.exceptions import AuthenticationException


def create_access_token(
    subject: uuid.UUID,
    *,
    role: str,
    extra_claims: dict[str, Any] | None = None,
) -> str:
    """Create a signed JWT access token."""
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "role": role,
        "type": "access",
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    if extra_claims:
        payload.update(extra_claims)
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def create_refresh_token(subject: uuid.UUID) -> str:
    """Create a signed JWT refresh token."""
    settings = get_settings()
    expire = datetime.now(UTC) + timedelta(days=settings.jwt_refresh_token_expire_days)
    payload: dict[str, Any] = {
        "sub": str(subject),
        "type": "refresh",
        "exp": expire,
        "iat": datetime.now(UTC),
    }
    return jwt.encode(payload, settings.jwt_secret_key, algorithm=settings.jwt_algorithm)


def decode_token(token: str) -> dict[str, Any]:
    """Decode and validate a JWT token."""
    settings = get_settings()
    try:
        return jwt.decode(
            token,
            settings.jwt_secret_key,
            algorithms=[settings.jwt_algorithm],
        )
    except jwt.ExpiredSignatureError as exc:
        raise AuthenticationException("Token has expired") from exc
    except jwt.InvalidTokenError as exc:
        raise AuthenticationException("Invalid token") from exc


def extract_user_id(token_payload: dict[str, Any]) -> uuid.UUID:
    """Extract user UUID from token payload."""
    sub = token_payload.get("sub")
    if not sub:
        raise AuthenticationException("Invalid token payload")
    try:
        return uuid.UUID(str(sub))
    except ValueError as exc:
        raise AuthenticationException("Invalid user ID in token") from exc
