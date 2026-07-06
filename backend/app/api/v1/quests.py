"""Quest API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import OptionalUser
from app.core.unit_of_work import UnitOfWork
from app.dependencies.services import get_uow
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.schemas.quest import QuestResponse
from app.services.quest import QuestService

router = APIRouter(prefix="/quests", tags=["Quests"])


def _quest_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> QuestService:
    return QuestService(uow)


@router.get(
    "",
    response_model=PaginatedResponse[QuestResponse],
    summary="List available quests",
)
async def list_quests(
    service: Annotated[QuestService, Depends(_quest_service)],
    current_user: OptionalUser,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    city_id: uuid.UUID | None = Query(default=None),
) -> PaginatedResponse[QuestResponse]:
    quests, meta = await service.list_quests(
        page=page, page_size=page_size, city_id=city_id, current_user=current_user
    )
    return PaginatedResponse(data=quests, meta=meta)


@router.get(
    "/{quest_id}",
    response_model=SuccessResponse[QuestResponse],
    summary="Get quest details by ID",
)
async def get_quest(
    quest_id: uuid.UUID,
    service: Annotated[QuestService, Depends(_quest_service)],
    current_user: OptionalUser,
) -> SuccessResponse[QuestResponse]:
    quest = await service.get_quest(quest_id, current_user=current_user)
    return SuccessResponse(data=quest)
