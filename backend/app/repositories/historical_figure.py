"""Historical figure repository."""

from sqlalchemy import select

from app.models.historical_figure import HistoricalFigure
from app.repositories.base import BaseRepository


class HistoricalFigureRepository(BaseRepository[HistoricalFigure]):
    model = HistoricalFigure

    async def get_active(self, *, offset: int = 0, limit: int = 20) -> list[HistoricalFigure]:
        stmt = (
            select(HistoricalFigure)
            .where(HistoricalFigure.is_active.is_(True))
            .order_by(HistoricalFigure.sort_order.asc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
