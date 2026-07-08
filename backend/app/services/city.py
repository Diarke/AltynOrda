"""City service with Redis caching."""

import json
import logging
import uuid

from redis.asyncio import Redis

from app.config import get_settings
from app.core.unit_of_work import UnitOfWork
from app.enums import Language, ProgressType
from app.exceptions import NotFoundException
from app.models.city import City
from app.models.user import User
from app.schemas.city import CityGalleryImageResponse, CityResponse, CitySummaryResponse
from app.schemas.common import PaginatedMeta
from app.utils.i18n import resolve_localized

logger = logging.getLogger(__name__)

CITIES_CACHE_KEY_PREFIX = "orda:cities:all"


class CityService:
    """City exploration and caching."""

    def __init__(self, uow: UnitOfWork, redis: Redis) -> None:
        self._uow = uow
        self._redis = redis
        self._settings = get_settings()

    async def list_cities(
        self,
        *,
        page: int = 1,
        page_size: int = 20,
        language: Language = Language.KAZAKH,
        current_user: User | None = None,
    ) -> tuple[list[CitySummaryResponse], PaginatedMeta]:
        # Cache key includes the language since summaries carry resolved text — but
        # never the per-user unlock state, which is merged in fresh below so one
        # user's progress can never leak into another's via the shared cache.
        cache_key = f"{CITIES_CACHE_KEY_PREFIX}:{language.value}"
        cached = await self._redis.get(cache_key)
        if cached:
            logger.debug("Cities cache hit")
            summaries = [CitySummaryResponse.model_validate(c) for c in json.loads(cached)]
        else:
            cities = await self._uow.cities.get_ordered()
            summaries = [self._to_summary(c, language) for c in cities]
            await self._redis.setex(
                cache_key,
                self._settings.redis_cities_cache_ttl_seconds,
                json.dumps([s.model_dump(mode="json") for s in summaries]),
            )

        unlocked_ids = await self._get_unlocked_city_ids(current_user)
        for summary in summaries:
            summary.is_unlocked = None if current_user is None else summary.id in unlocked_ids

        total = len(summaries)
        offset = (page - 1) * page_size
        page_data = summaries[offset : offset + page_size]
        return page_data, PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_city(
        self,
        city_id: uuid.UUID,
        *,
        language: Language = Language.KAZAKH,
        current_user: User | None = None,
    ) -> CityResponse:
        city = await self._uow.cities.get_by_id(city_id)
        if city is None:
            raise NotFoundException("City not found")
        unlocked_ids = await self._get_unlocked_city_ids(current_user)
        is_unlocked = None if current_user is None else city.id in unlocked_ids
        return self._to_response(city, language, is_unlocked)

    async def _get_unlocked_city_ids(self, current_user: User | None) -> set[uuid.UUID]:
        if current_user is None:
            return set()
        records = await self._uow.progress.get_by_user_and_entity_type(current_user.id, ProgressType.CITY)
        return {record.entity_id for record in records}

    async def invalidate_cache(self) -> None:
        keys = [f"{CITIES_CACHE_KEY_PREFIX}:{lang.value}" for lang in Language]
        await self._redis.delete(*keys)

    async def list_gallery(
        self, city_id: uuid.UUID, *, language: Language
    ) -> list[CityGalleryImageResponse]:
        if await self._uow.cities.get_by_id(city_id) is None:
            raise NotFoundException("City not found")
        images = await self._uow.gallery_images.search(
            city_id=city_id, language=language.value, is_active=True, limit=100
        )
        return [
            CityGalleryImageResponse(
                id=image.id,
                title=image.title,
                description=image.description,
                image_url=image.image_url,
                alt_text=image.alt_text,
                sort_order=image.sort_order,
            )
            for image in images
        ]

    @staticmethod
    def _to_response(city: City, language: Language, is_unlocked: bool | None = None) -> CityResponse:
        return CityResponse(
            id=city.id,
            name=resolve_localized(city, "name", language),
            slug=city.slug,
            description=resolve_localized(city, "description", language),
            historical_period=resolve_localized(city, "historical_period", language),
            latitude=city.latitude,
            longitude=city.longitude,
            image_url=city.image_url,
            population_estimate=resolve_localized(city, "population_estimate", language),
            significance=resolve_localized(city, "significance", language),
            historical_facts=resolve_localized(city, "historical_facts", language),
            trade_info=resolve_localized(city, "trade_info", language),
            sort_order=city.sort_order,
            is_unlocked=is_unlocked,
            created_at=city.created_at,
        )

    @staticmethod
    def _to_summary(city: City, language: Language) -> CitySummaryResponse:
        return CitySummaryResponse(
            id=city.id,
            name=resolve_localized(city, "name", language),
            slug=city.slug,
            historical_period=resolve_localized(city, "historical_period", language),
            latitude=city.latitude,
            longitude=city.longitude,
            image_url=city.image_url,
            sort_order=city.sort_order,
        )
