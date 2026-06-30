"""Custom application exceptions."""

from typing import Any


class BaseAppException(Exception):
    """Base exception for all application errors."""

    def __init__(
        self,
        message: str,
        *,
        status_code: int = 500,
        details: dict[str, Any] | None = None,
    ) -> None:
        self.message = message
        self.status_code = status_code
        self.details = details or {}
        super().__init__(message)


class AuthenticationException(BaseAppException):
    def __init__(self, message: str = "Authentication failed", **kwargs: Any) -> None:
        super().__init__(message, status_code=401, **kwargs)


class ValidationException(BaseAppException):
    def __init__(self, message: str = "Validation error", **kwargs: Any) -> None:
        super().__init__(message, status_code=422, **kwargs)


class NotFoundException(BaseAppException):
    def __init__(self, message: str = "Resource not found", **kwargs: Any) -> None:
        super().__init__(message, status_code=404, **kwargs)


class PermissionDeniedException(BaseAppException):
    def __init__(self, message: str = "Permission denied", **kwargs: Any) -> None:
        super().__init__(message, status_code=403, **kwargs)


class ConflictException(BaseAppException):
    def __init__(self, message: str = "Resource conflict", **kwargs: Any) -> None:
        super().__init__(message, status_code=409, **kwargs)


class AIException(BaseAppException):
    def __init__(self, message: str = "AI service error", **kwargs: Any) -> None:
        super().__init__(message, status_code=503, **kwargs)


class RateLimitException(BaseAppException):
    def __init__(self, message: str = "Rate limit exceeded", **kwargs: Any) -> None:
        super().__init__(message, status_code=429, **kwargs)
