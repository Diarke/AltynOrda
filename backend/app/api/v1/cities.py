"""City API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies.services import get_city_service
from app.schemas.city import CityResponse, CitySummaryResponse
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.services.city import CityService

router = APIRouter(prefix="/cities", tags=["Cities"])


@router.get(
    "",
    response_model=PaginatedResponse[CitySummaryResponse],
    summary="List all historical cities",
)
async def list_cities(
    service: Annotated[CityService, Depends(get_city_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[CitySummaryResponse]:
    cities, meta = await service.list_cities(page=page, page_size=page_size)
    return PaginatedResponse(data=cities, meta=meta)


@router.get(
    "/{city_id}",
    response_model=SuccessResponse[CityResponse],
    summary="Get city details by ID",
)
async def get_city(
    city_id: uuid.UUID,
    service: Annotated[CityService, Depends(get_city_service)],
) -> SuccessResponse[CityResponse]:
    city = await service.get_city(city_id)
    return SuccessResponse(data=city)
