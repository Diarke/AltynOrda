"""Artifact API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.core.unit_of_work import UnitOfWork
from app.dependencies.services import get_uow
from app.schemas.artifact import ArtifactResponse
from app.schemas.common import PaginatedResponse, SuccessResponse
from app.services.artifact import ArtifactService

router = APIRouter(prefix="/artifacts", tags=["Artifacts"])


def _artifact_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> ArtifactService:
    return ArtifactService(uow)


@router.get(
    "",
    response_model=PaginatedResponse[ArtifactResponse],
    summary="List collectible artifacts",
)
async def list_artifacts(
    service: Annotated[ArtifactService, Depends(_artifact_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
    city_id: uuid.UUID | None = Query(default=None),
) -> PaginatedResponse[ArtifactResponse]:
    artifacts, meta = await service.list_artifacts(page=page, page_size=page_size, city_id=city_id)
    return PaginatedResponse(data=artifacts, meta=meta)


@router.get(
    "/{artifact_id}",
    response_model=SuccessResponse[ArtifactResponse],
    summary="Get artifact details by ID",
)
async def get_artifact(
    artifact_id: uuid.UUID,
    service: Annotated[ArtifactService, Depends(_artifact_service)],
) -> SuccessResponse[ArtifactResponse]:
    artifact = await service.get_artifact(artifact_id)
    return SuccessResponse(data=artifact)
