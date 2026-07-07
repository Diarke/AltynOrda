"""Notification repository."""

import uuid

from sqlalchemy import func, select

from app.models.notification import Notification
from app.repositories.base import BaseRepository


class NotificationRepository(BaseRepository[Notification]):
    model = Notification

    def _user_stmt(self, user_id: uuid.UUID, unread_only: bool):
        stmt = select(Notification).where(Notification.user_id == user_id)
        if unread_only:
            stmt = stmt.where(Notification.is_read.is_(False))
        return stmt

    async def get_by_user(
        self, user_id: uuid.UUID, *, unread_only: bool = False, offset: int = 0, limit: int = 20
    ) -> list[Notification]:
        stmt = (
            self._user_stmt(user_id, unread_only)
            .order_by(Notification.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_by_user(self, user_id: uuid.UUID, *, unread_only: bool = False) -> int:
        stmt = select(func.count()).select_from(self._user_stmt(user_id, unread_only).subquery())
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def mark_all_read(self, user_id: uuid.UUID) -> int:
        notifications = await self.get_by_user(user_id, unread_only=True, limit=10_000)
        for notification in notifications:
            notification.is_read = True
        await self.session.flush()
        return len(notifications)
