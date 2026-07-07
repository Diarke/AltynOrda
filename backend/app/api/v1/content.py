"""Public homepage content routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.enums import Language
from app.schemas.common import SuccessResponse
from app.schemas.homepage_content import HomepageContentResponse

router = APIRouter(prefix="/homepage-content", tags=["Homepage Content"])


@router.get(
    "",
    response_model=SuccessResponse[list[HomepageContentResponse]],
    summary="List active homepage content blocks",
)
async def list_homepage_content(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    section: str | None = None,
    language: Language = Language.KAZAKH,
) -> SuccessResponse[list[HomepageContentResponse]]:
    items = await uow.homepage_content.search(
        section=section, language=language.value, limit=100
    )
    return SuccessResponse(
        data=[
            HomepageContentResponse(
                id=item.id,
                section=item.section,
                language=item.language,
                title=item.title,
                body=item.body,
                image_url=item.image_url,
                cta_text=item.cta_text,
                cta_url=item.cta_url,
                sort_order=item.sort_order,
            )
            for item in items
            if item.is_active
        ]
    )
