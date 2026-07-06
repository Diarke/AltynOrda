"""FastAPI authentication dependencies."""

from typing import Annotated

from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from app.auth.jwt import decode_token, extract_user_id
from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.enums import UserRole
from app.exceptions import AuthenticationException, PermissionDeniedException
from app.models.user import User

security = HTTPBearer(auto_error=False)


async def get_current_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> User:
    """Resolve the authenticated user from the Bearer token."""
    if credentials is None:
        raise AuthenticationException("Missing authentication credentials")

    payload = decode_token(credentials.credentials)
    if payload.get("type") != "access":
        raise AuthenticationException("Invalid token type")

    user_id = extract_user_id(payload)
    user = await uow.users.get_by_id(user_id)
    if user is None or not user.is_active:
        raise AuthenticationException("User not found or inactive")
    return user


async def get_current_active_user(
    current_user: Annotated[User, Depends(get_current_user)],
) -> User:
    """Ensure the current user is active."""
    if not current_user.is_active:
        raise AuthenticationException("Inactive user account")
    return current_user


async def require_admin(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Require admin role."""
    if current_user.role != UserRole.ADMIN:
        raise PermissionDeniedException("Admin access required")
    return current_user


async def require_user_or_admin(
    current_user: Annotated[User, Depends(get_current_active_user)],
) -> User:
    """Require a non-guest account."""
    if current_user.role not in {UserRole.USER, UserRole.ADMIN}:
        raise PermissionDeniedException("Authentication required")
    return current_user


async def get_optional_user(
    credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> User | None:
    """Resolve the current user if a valid Bearer token is present, else None."""
    if credentials is None:
        return None
    try:
        payload = decode_token(credentials.credentials)
        if payload.get("type") != "access":
            return None
        user_id = extract_user_id(payload)
    except AuthenticationException:
        return None
    user = await uow.users.get_by_id(user_id)
    if user is None or not user.is_active:
        return None
    return user


CurrentUser = Annotated[User, Depends(get_current_active_user)]
UserOrAdmin = Annotated[User, Depends(require_user_or_admin)]
AdminUser = Annotated[User, Depends(require_admin)]
OptionalUser = Annotated[User | None, Depends(get_optional_user)]
