"""Public historical figure routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query

from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.schemas.common import PaginatedMeta, PaginatedResponse, SuccessResponse
from app.schemas.historical_figure import HistoricalFigureResponse

router = APIRouter(prefix="/historical-figures", tags=["Historical Figures"])


def _to_response(figure) -> HistoricalFigureResponse:
    return HistoricalFigureResponse(
        id=figure.id,
        name=figure.name,
        title=figure.title,
        description=figure.description,
        era=figure.era,
        significance=figure.significance,
        image_url=figure.image_url,
        city_id=figure.city_id,
        sort_order=figure.sort_order,
        created_at=figure.created_at,
    )


@router.get(
    "",
    response_model=PaginatedResponse[HistoricalFigureResponse],
    summary="List notable historical figures",
)
async def list_historical_figures(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[HistoricalFigureResponse]:
    offset = (page - 1) * page_size
    figures = await uow.historical_figures.get_active(offset=offset, limit=page_size)
    total = await uow.historical_figures.count_search(filters={"is_active": True})
    total_pages = max(1, (total + page_size - 1) // page_size)
    return PaginatedResponse(
        data=[_to_response(f) for f in figures],
        meta=PaginatedMeta(page=page, page_size=page_size, total=total, total_pages=total_pages),
    )


@router.get(
    "/{figure_id}",
    response_model=SuccessResponse[HistoricalFigureResponse],
    summary="Get a historical figure by ID",
)
async def get_historical_figure(
    figure_id: uuid.UUID,
    uow: Annotated[UnitOfWork, Depends(get_uow)],
) -> SuccessResponse[HistoricalFigureResponse]:
    figure = await uow.historical_figures.get_by_id(figure_id)
    if figure is None or not figure.is_active:
        raise HTTPException(status_code=404, detail="Historical figure not found")
    return SuccessResponse(data=_to_response(figure))
