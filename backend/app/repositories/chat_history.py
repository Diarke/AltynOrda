"""Chat history repository."""

import uuid

from sqlalchemy import select

from app.models.chat_history import ChatHistory
from app.repositories.base import BaseRepository


class ChatHistoryRepository(BaseRepository[ChatHistory]):
    model = ChatHistory

    async def get_by_user(
        self,
        user_id: uuid.UUID,
        *,
        city_id: uuid.UUID | None = None,
        limit: int = 50,
    ) -> list[ChatHistory]:
        stmt = select(ChatHistory).where(ChatHistory.user_id == user_id)
        if city_id is not None:
            stmt = stmt.where(ChatHistory.city_id == city_id)
        stmt = stmt.order_by(ChatHistory.created_at.desc()).limit(limit)
        result = await self.session.execute(stmt)
        return list(reversed(result.scalars().all()))
