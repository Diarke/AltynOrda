"""City service with Redis caching."""

import json
import logging
import uuid

from redis.asyncio import Redis

from app.config import get_settings
from app.core.unit_of_work import UnitOfWork
from app.exceptions import NotFoundException
from app.models.city import City
from app.schemas.city import CityResponse, CitySummaryResponse
from app.schemas.common import PaginatedMeta

logger = logging.getLogger(__name__)

CITIES_CACHE_KEY = "orda:cities:all"


class CityService:
    """City exploration and caching."""

    def __init__(self, uow: UnitOfWork, redis: Redis) -> None:
        self._uow = uow
        self._redis = redis
        self._settings = get_settings()

    async def list_cities(
        self, *, page: int = 1, page_size: int = 20
    ) -> tuple[list[CitySummaryResponse], PaginatedMeta]:
        cached = await self._redis.get(CITIES_CACHE_KEY)
        if cached:
            logger.debug("Cities cache hit")
            summaries = [CitySummaryResponse.model_validate(c) for c in json.loads(cached)]
            total = len(summaries)
            offset = (page - 1) * page_size
            page_data = summaries[offset : offset + page_size]
            return page_data, PaginatedMeta(
                page=page,
                page_size=page_size,
                total=total,
                total_pages=max(1, (total + page_size - 1) // page_size),
            )

        offset = (page - 1) * page_size
        cities = await self._uow.cities.get_all(offset=0, limit=1000)
        summaries = [self._to_summary(c) for c in cities]
        await self._redis.setex(
            CITIES_CACHE_KEY,
            self._settings.redis_cities_cache_ttl_seconds,
            json.dumps([s.model_dump(mode="json") for s in summaries]),
        )

        total = await self._uow.cities.count()
        page_cities = await self._uow.cities.get_all(offset=offset, limit=page_size)
        return [self._to_summary(c) for c in page_cities], PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_city(self, city_id: uuid.UUID) -> CityResponse:
        city = await self._uow.cities.get_by_id(city_id)
        if city is None:
            raise NotFoundException("City not found")
        return self._to_response(city)

    async def invalidate_cache(self) -> None:
        await self._redis.delete(CITIES_CACHE_KEY)

    @staticmethod
    def _to_response(city: City) -> CityResponse:
        return CityResponse(
            id=city.id,
            name=city.name,
            slug=city.slug,
            description=city.description,
            historical_period=city.historical_period,
            latitude=city.latitude,
            longitude=city.longitude,
            image_url=city.image_url,
            population_estimate=city.population_estimate,
            significance=city.significance,
            created_at=city.created_at,
        )

    @staticmethod
    def _to_summary(city: City) -> CitySummaryResponse:
        return CitySummaryResponse(
            id=city.id,
            name=city.name,
            slug=city.slug,
            historical_period=city.historical_period,
            latitude=city.latitude,
            longitude=city.longitude,
            image_url=city.image_url,
        )
