"""Exceptions package."""

from app.exceptions.base import (
    AIException,
    AuthenticationException,
    BaseAppException,
    ConflictException,
    NotFoundException,
    PermissionDeniedException,
    RateLimitException,
    ValidationException,
)
from app.exceptions.handlers import register_exception_handlers

__all__ = [
    "AIException",
    "AuthenticationException",
    "BaseAppException",
    "ConflictException",
    "NotFoundException",
    "PermissionDeniedException",
    "RateLimitException",
    "ValidationException",
    "register_exception_handlers",
]
