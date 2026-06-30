"""Shared Pydantic schemas for API responses."""

from typing import Any, Generic, TypeVar

from pydantic import BaseModel, ConfigDict, Field

T = TypeVar("T")


class BaseSchema(BaseModel):
    """Base schema with common configuration."""

    model_config = ConfigDict(from_attributes=False, populate_by_name=True)


class ErrorResponse(BaseSchema):
    success: bool = False
    message: str
    errors: dict[str, Any] | None = None


class SuccessResponse(BaseSchema, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: T | None = None


class PaginatedMeta(BaseSchema):
    page: int
    page_size: int
    total: int
    total_pages: int


class PaginatedResponse(BaseSchema, Generic[T]):
    success: bool = True
    message: str = "OK"
    data: list[T]
    meta: PaginatedMeta


class PaginationParams(BaseSchema):
    page: int = Field(default=1, ge=1)
    page_size: int = Field(default=20, ge=1, le=100)
