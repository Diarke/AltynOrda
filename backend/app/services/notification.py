"""Notification creation helper and read/management service.

`notify()` is imported directly by other services (progress, certificate,
admin) at the exact moment a real event happens — there is no polling or
background job, every notification is created synchronously as part of the
same transaction as the event that caused it.
"""

import uuid
from typing import Callable

from app.core.unit_of_work import UnitOfWork
from app.enums import Language, NotificationType
from app.exceptions import NotFoundException
from app.i18n.messages import render_certificate, render_notification
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationResponse
from app.utils.i18n import resolve_localized


async def notify(
    uow: UnitOfWork,
    user_id: uuid.UUID,
    notification_type: NotificationType,
    language: Language,
    *,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
    **template_kwargs: object,
) -> Notification:
    """Create a notification, rendered in `language`. Caller is responsible for committing."""
    title, message = render_notification(notification_type, language, **template_kwargs)
    notification = Notification(
        user_id=user_id,
        type=notification_type.value,
        title=title,
        message=message,
        entity_type=entity_type,
        entity_id=entity_id,
        params=template_kwargs or None,
    )
    return await uow.notifications.create(notification)


async def notify_all_active_users(
    uow: UnitOfWork,
    notification_type: NotificationType,
    build_kwargs: Callable[[User], dict[str, object]] | None = None,
    *,
    entity_type: str | None = None,
    entity_id: uuid.UUID | None = None,
) -> int:
    """Broadcast a notification to every active user (e.g. a new quest going live),
    each rendered in that user's own language. `build_kwargs` lets the caller derive
    per-recipient template values (e.g. a quest title resolved to the recipient's language)."""
    users = await uow.users.search(is_active=True, limit=10_000)
    for user in users:
        kwargs = build_kwargs(user) if build_kwargs else {}
        await notify(
            uow,
            user.id,
            notification_type,
            user.language,
            entity_type=entity_type,
            entity_id=entity_id,
            **kwargs,
        )
    return len(users)


class NotificationService:
    """Read/management operations for a user's own notification center."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def list_for_user(
        self,
        user_id: uuid.UUID,
        *,
        unread_only: bool = False,
        offset: int = 0,
        limit: int = 20,
        language: Language | None = None,
    ) -> list[NotificationResponse]:
        notifications = await self._uow.notifications.get_by_user(
            user_id, unread_only=unread_only, offset=offset, limit=limit
        )
        return [await self._to_response(n, language) for n in notifications]

    async def count_for_user(self, user_id: uuid.UUID, *, unread_only: bool = False) -> int:
        return await self._uow.notifications.count_by_user(user_id, unread_only=unread_only)

    async def mark_read(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> NotificationResponse:
        notification = await self._uow.notifications.get_by_id(notification_id)
        if notification is None or notification.user_id != user_id:
            raise NotFoundException("Notification not found")
        notification.is_read = True
        updated = await self._uow.notifications.update(notification)
        await self._uow.session.commit()
        return await self._to_response(updated)

    async def _resolve_live_label(
        self, entity_type: str | None, entity_id: uuid.UUID | None, language: Language
    ) -> str | None:
        """Re-resolve the proper noun embedded in a notification (artifact name,
        achievement title, quest title, certificate title) against its live source
        entity, so switching language never leaves that name stuck in the language
        it was originally awarded in."""
        if entity_type is None or entity_id is None:
            return None
        if entity_type == "artifact":
            artifact = await self._uow.artifacts.get_by_id(entity_id)
            return resolve_localized(artifact, "name", language) if artifact else None
        if entity_type == "achievement_definition":
            definition = await self._uow.achievement_definitions.get_by_id(entity_id)
            return resolve_localized(definition, "title", language) if definition else None
        if entity_type == "quest":
            quest = await self._uow.quests.get_by_id(entity_id)
            return resolve_localized(quest, "title", language) if quest else None
        if entity_type == "city":
            city = await self._uow.cities.get_by_id(entity_id)
            return resolve_localized(city, "name", language) if city else None
        if entity_type == "certificate":
            certificate = await self._uow.certificates.get_by_id(entity_id)
            if certificate is None:
                return None
            recipient = await self._uow.users.get_by_id(certificate.user_id)
            display_name = (recipient.full_name or recipient.username) if recipient else ""
            title, _ = render_certificate(language, name=display_name, percent=certificate.completion_percent)
            return title
        return None

    async def _render(self, notification: Notification, language: Language | None) -> tuple[str, str]:
        if language is None or not notification.params:
            return notification.title, notification.message
        kwargs = dict(notification.params)
        live_label = await self._resolve_live_label(notification.entity_type, notification.entity_id, language)
        if live_label is not None:
            if "title" in kwargs:
                kwargs["title"] = live_label
            elif "name" in kwargs:
                kwargs["name"] = live_label
        try:
            return render_notification(NotificationType(notification.type), language, **kwargs)
        except (KeyError, ValueError):
            return notification.title, notification.message

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        count = await self._uow.notifications.mark_all_read(user_id)
        await self._uow.session.commit()
        return count

    async def delete(self, user_id: uuid.UUID, notification_id: uuid.UUID) -> None:
        notification = await self._uow.notifications.get_by_id(notification_id)
        if notification is None or notification.user_id != user_id:
            raise NotFoundException("Notification not found")
        await self._uow.notifications.delete(notification)
        await self._uow.session.commit()

    async def _to_response(
        self, notification: Notification, language: Language | None = None
    ) -> NotificationResponse:
        title, message = await self._render(notification, language)
        return NotificationResponse(
            id=notification.id,
            type=notification.type,
            title=title,
            message=message,
            entity_type=notification.entity_type,
            entity_id=notification.entity_id,
            is_read=notification.is_read,
            created_at=notification.created_at,
        )
