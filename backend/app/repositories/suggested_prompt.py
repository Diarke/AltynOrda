"""Suggested prompt repository."""

from sqlalchemy import select

from app.enums import Language
from app.models.suggested_prompt import SuggestedPrompt
from app.repositories.base import BaseRepository


class SuggestedPromptRepository(BaseRepository[SuggestedPrompt]):
    model = SuggestedPrompt

    async def get_active(self, language: Language) -> list[SuggestedPrompt]:
        stmt = (
            select(SuggestedPrompt)
            .where(SuggestedPrompt.language == language, SuggestedPrompt.is_active.is_(True))
            .order_by(SuggestedPrompt.sort_order.asc())
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
