"""Notification center routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import CurrentUser
from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.enums import Language
from app.schemas.common import PaginatedMeta, PaginatedResponse, SuccessResponse
from app.schemas.notification import NotificationResponse, UnreadCountResponse
from app.services.notification import NotificationService

router = APIRouter(prefix="/notifications", tags=["Notifications"])


def _service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> NotificationService:
    return NotificationService(uow)


def _meta(page: int, page_size: int, total: int) -> PaginatedMeta:
    return PaginatedMeta(
        page=page, page_size=page_size, total=total, total_pages=max(1, (total + page_size - 1) // page_size)
    )


@router.get(
    "",
    response_model=PaginatedResponse[NotificationResponse],
    summary="List the current user's notifications",
)
async def list_notifications(
    current_user: CurrentUser,
    service: Annotated[NotificationService, Depends(_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    unread_only: bool = Query(default=False),
    language: Language | None = Query(default=None),
) -> PaginatedResponse[NotificationResponse]:
    offset = (page - 1) * page_size
    notifications = await service.list_for_user(
        current_user.id, unread_only=unread_only, offset=offset, limit=page_size, language=language
    )
    total = await service.count_for_user(current_user.id, unread_only=unread_only)
    return PaginatedResponse(data=notifications, meta=_meta(page, page_size, total))


@router.get(
    "/unread-count",
    response_model=SuccessResponse[UnreadCountResponse],
    summary="Get the current user's unread notification count",
)
async def get_unread_count(
    current_user: CurrentUser,
    service: Annotated[NotificationService, Depends(_service)],
) -> SuccessResponse[UnreadCountResponse]:
    count = await service.count_for_user(current_user.id, unread_only=True)
    return SuccessResponse(data=UnreadCountResponse(unread_count=count))


@router.post(
    "/{notification_id}/read",
    response_model=SuccessResponse[NotificationResponse],
    summary="Mark a notification as read",
)
async def mark_notification_read(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[NotificationService, Depends(_service)],
) -> SuccessResponse[NotificationResponse]:
    notification = await service.mark_read(current_user.id, notification_id)
    return SuccessResponse(data=notification)


@router.post(
    "/read-all",
    response_model=SuccessResponse[None],
    summary="Mark all of the current user's notifications as read",
)
async def mark_all_notifications_read(
    current_user: CurrentUser,
    service: Annotated[NotificationService, Depends(_service)],
) -> SuccessResponse[None]:
    count = await service.mark_all_read(current_user.id)
    return SuccessResponse(message=f"{count} notification(s) marked as read")


@router.delete(
    "/{notification_id}",
    response_model=SuccessResponse[None],
    summary="Delete a notification",
)
async def delete_notification(
    notification_id: uuid.UUID,
    current_user: CurrentUser,
    service: Annotated[NotificationService, Depends(_service)],
) -> SuccessResponse[None]:
    await service.delete(current_user.id, notification_id)
    return SuccessResponse(message="Notification deleted")
