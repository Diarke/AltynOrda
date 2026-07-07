"""One-off, idempotent backfill: fills in `_kk`/`_ru` translations for
City/Artifact/Quest/AchievementDefinition rows that were created before those
columns existed (or before translations were authored) — matched by their
existing English content / unique key. Only ever fills a currently-empty
`_kk`/`_ru` field; `_en` and already-translated fields are never touched, so
this is safe to re-run at any time.

Run with:  python -m app.scripts.backfill_translations
"""

import asyncio
import logging

from sqlalchemy import select

from app.database.redis import close_redis, get_redis_client
from app.database.session import dispose_engine, get_session_factory
from app.models.achievement_definition import AchievementDefinition
from app.models.artifact import Artifact
from app.models.city import City
from app.models.quest import Quest
from app.scripts.seed_data import (
    ACHIEVEMENT_DEFINITIONS,
    ARTIFACTS,
    CITIES,
    CITIES_CACHE_KEYS,
    QUESTS,
)

logging.basicConfig(level=logging.INFO, format="%(message)s")
logger = logging.getLogger("backfill_translations")

LOCALIZED_LANGS = ("kk", "ru")


def _fill_missing(entity: object, data: dict, fields: tuple[str, ...]) -> bool:
    changed = False
    for field in fields:
        for lang in LOCALIZED_LANGS:
            key = f"{field}_{lang}"
            if not getattr(entity, key) and data.get(key):
                setattr(entity, key, data[key])
                changed = True
    return changed


async def backfill_cities(session) -> dict[str, str]:
    result = await session.execute(select(City))
    by_slug = {c.slug: c for c in result.scalars().all()}
    fields = (
        "name", "description", "historical_period", "population_estimate",
        "significance", "historical_facts", "trade_info",
    )
    updated = sum(
        1
        for data in CITIES
        if (city := by_slug.get(data["slug"])) is not None and _fill_missing(city, data, fields)
    )
    logger.info("Backfilled translations for %d/%d cities.", updated, len(CITIES))
    return {slug: str(city.id) for slug, city in by_slug.items()}


async def backfill_artifacts(session, city_id_by_slug: dict[str, str]) -> None:
    result = await session.execute(select(Artifact))
    by_key = {(str(a.city_id), a.name_en): a for a in result.scalars().all()}
    fields = ("name", "description", "era", "historical_context")
    updated = 0
    for data in ARTIFACTS:
        city_id = city_id_by_slug.get(data["city_slug"])
        artifact = by_key.get((city_id, data["name_en"])) if city_id else None
        if artifact is not None and _fill_missing(artifact, data, fields):
            updated += 1
    logger.info("Backfilled translations for %d/%d artifacts.", updated, len(ARTIFACTS))


async def backfill_quests(session, city_id_by_slug: dict[str, str]) -> None:
    result = await session.execute(select(Quest))
    by_key = {(str(q.city_id), q.title_en): q for q in result.scalars().all()}
    fields = ("title", "description")
    updated = 0
    for data in QUESTS:
        city_id = city_id_by_slug.get(data["city_slug"])
        quest = by_key.get((city_id, data["title_en"])) if city_id else None
        if quest is not None and _fill_missing(quest, data, fields):
            updated += 1
    logger.info("Backfilled translations for %d/%d quests.", updated, len(QUESTS))


async def backfill_achievement_definitions(session) -> None:
    result = await session.execute(select(AchievementDefinition))
    by_key = {d.key: d for d in result.scalars().all()}
    fields = ("title", "description")
    updated = sum(
        1
        for data in ACHIEVEMENT_DEFINITIONS
        if (definition := by_key.get(data["key"])) is not None and _fill_missing(definition, data, fields)
    )
    logger.info("Backfilled translations for %d/%d achievement definitions.", updated, len(ACHIEVEMENT_DEFINITIONS))


async def main() -> None:
    factory = get_session_factory()
    async with factory() as session:
        city_id_by_slug = await backfill_cities(session)
        await backfill_artifacts(session, city_id_by_slug)
        await backfill_quests(session, city_id_by_slug)
        await backfill_achievement_definitions(session)
        await session.commit()

    redis = await get_redis_client()
    await redis.delete(*CITIES_CACHE_KEYS)
    await close_redis()
    await dispose_engine()
    logger.info("Backfill complete.")


if __name__ == "__main__":
    asyncio.run(main())
