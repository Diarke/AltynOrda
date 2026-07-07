"""City API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.dependencies.services import get_city_service
from app.enums import Language
from app.schemas.city import CityGalleryImageResponse, CityResponse, CitySummaryResponse
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
    language: Language = Language.KAZAKH,
) -> PaginatedResponse[CitySummaryResponse]:
    cities, meta = await service.list_cities(page=page, page_size=page_size, language=language)
    return PaginatedResponse(data=cities, meta=meta)


@router.get(
    "/{city_id}",
    response_model=SuccessResponse[CityResponse],
    summary="Get city details by ID",
)
async def get_city(
    city_id: uuid.UUID,
    service: Annotated[CityService, Depends(get_city_service)],
    language: Language = Language.KAZAKH,
) -> SuccessResponse[CityResponse]:
    city = await service.get_city(city_id, language=language)
    return SuccessResponse(data=city)


@router.get(
    "/{city_id}/gallery",
    response_model=SuccessResponse[list[CityGalleryImageResponse]],
    summary="Get a city's image gallery",
)
async def get_city_gallery(
    city_id: uuid.UUID,
    service: Annotated[CityService, Depends(get_city_service)],
    language: Language = Language.KAZAKH,
) -> SuccessResponse[list[CityGalleryImageResponse]]:
    images = await service.list_gallery(city_id, language=language)
    return SuccessResponse(data=images)
