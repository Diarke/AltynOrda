"""Progress API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import UserOrAdmin
from app.dependencies.services import get_progress_service
from app.schemas.common import SuccessResponse
from app.schemas.progress import ProgressCreateRequest, ProgressResponse, UserProgressSummary
from app.services.progress import ProgressService

router = APIRouter(prefix="/progress", tags=["Progress"])


@router.get(
    "",
    response_model=SuccessResponse[UserProgressSummary],
    summary="Get current user progress summary",
)
async def get_progress(
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
) -> SuccessResponse[UserProgressSummary]:
    summary = await service.get_user_progress(current_user)
    return SuccessResponse(data=summary)


@router.post(
    "",
    response_model=SuccessResponse[ProgressResponse],
    summary="Create a new progress record",
)
async def create_progress(
    data: ProgressCreateRequest,
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
) -> SuccessResponse[ProgressResponse]:
    progress = await service.create_progress(current_user, data)
    return SuccessResponse(message="Progress created", data=progress)
