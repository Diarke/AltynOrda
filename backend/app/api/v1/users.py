"""User API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import CurrentUser
from app.dependencies.services import get_user_service
from app.schemas.auth import UserResponse, UserUpdateRequest
from app.schemas.common import SuccessResponse
from app.services.user import UserService

router = APIRouter(prefix="/users", tags=["Users"])


@router.get(
    "/me",
    response_model=SuccessResponse[UserResponse],
    summary="Get current authenticated user profile",
)
async def get_me(
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> SuccessResponse[UserResponse]:
    profile = await service.get_profile(current_user)
    return SuccessResponse(data=profile)


@router.patch(
    "/me",
    response_model=SuccessResponse[UserResponse],
    summary="Update current user profile",
)
async def update_me(
    data: UserUpdateRequest,
    current_user: CurrentUser,
    service: Annotated[UserService, Depends(get_user_service)],
) -> SuccessResponse[UserResponse]:
    profile = await service.update_profile(current_user, data)
    return SuccessResponse(message="Profile updated", data=profile)
