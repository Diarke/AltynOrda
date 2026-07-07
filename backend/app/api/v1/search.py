"""Global search route — cities, artifacts, quests, historical figures, AI prompts."""

from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.enums import Language
from app.schemas.common import SuccessResponse
from app.schemas.search import GlobalSearchResponse, SearchResultItem
from app.utils.i18n import resolve_localized

router = APIRouter(prefix="/search", tags=["Search"])

RESULTS_PER_CATEGORY = 6


@router.get(
    "",
    response_model=SuccessResponse[GlobalSearchResponse],
    summary="Global search across cities, artifacts, quests, historical figures, and AI prompts",
)
async def global_search(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    q: str = Query(default="", max_length=200),
    language: Language = Language.KAZAKH,
) -> SuccessResponse[GlobalSearchResponse]:
    query = q.strip()
    if not query:
        return SuccessResponse(
            data=GlobalSearchResponse(
                cities=[], artifacts=[], quests=[], historical_figures=[], suggested_prompts=[]
            )
        )

    lang = language.value
    cities = await uow.cities.search(
        search_query=query,
        search_fields=[f"name_{lang}", f"description_{lang}", f"historical_period_{lang}"],
        limit=RESULTS_PER_CATEGORY,
    )
    artifacts = await uow.artifacts.search(
        search_query=query,
        search_fields=[f"name_{lang}", f"era_{lang}", f"description_{lang}"],
        limit=RESULTS_PER_CATEGORY,
    )
    quests = await uow.quests.search(
        search_query=query, search_fields=[f"title_{lang}", f"description_{lang}"], limit=RESULTS_PER_CATEGORY
    )
    figures = await uow.historical_figures.search(
        search_query=query,
        search_fields=["name", "title", "description"],
        filters={"is_active": True},
        limit=RESULTS_PER_CATEGORY,
    )
    prompts = await uow.suggested_prompts.search(
        search_query=query,
        search_fields=["prompt_text"],
        filters={"language": language.value, "is_active": True},
        limit=RESULTS_PER_CATEGORY,
    )

    return SuccessResponse(
        data=GlobalSearchResponse(
            cities=[
                SearchResultItem(
                    id=c.id,
                    type="city",
                    title=resolve_localized(c, "name", language),
                    subtitle=resolve_localized(c, "historical_period", language),
                )
                for c in cities
            ],
            artifacts=[
                SearchResultItem(
                    id=a.id,
                    type="artifact",
                    title=resolve_localized(a, "name", language),
                    subtitle=resolve_localized(a, "era", language),
                    city_id=a.city_id,
                )
                for a in artifacts
            ],
            quests=[
                SearchResultItem(
                    id=qq.id,
                    type="quest",
                    title=resolve_localized(qq, "title", language),
                    subtitle=qq.difficulty,
                    city_id=qq.city_id,
                )
                for qq in quests
            ],
            historical_figures=[
                SearchResultItem(id=f.id, type="historical_figure", title=f.name, subtitle=f.title)
                for f in figures
            ],
            suggested_prompts=[
                SearchResultItem(id=p.id, type="suggested_prompt", title=p.prompt_text)
                for p in prompts
            ],
        )
    )
