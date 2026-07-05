"""User API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends, File, UploadFile

from app.auth.dependencies import UserOrAdmin
from app.dependencies.services import get_storage_service, get_user_service
from app.services.storage import StorageService
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
    current_user: UserOrAdmin,
    service: UserService = Depends(get_user_service),
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
    current_user: UserOrAdmin,
    service: UserService = Depends(get_user_service),
) -> SuccessResponse[UserResponse]:
    profile = await service.update_profile(current_user, data)
    return SuccessResponse(message="Profile updated", data=profile)


@router.post(
    "/me/avatar",
    response_model=SuccessResponse[UserResponse],
    summary="Upload a profile avatar",
)
async def upload_avatar(
    current_user: UserOrAdmin,
    file: UploadFile = File(...),
    service: UserService = Depends(get_user_service),
    storage_service: StorageService = Depends(get_storage_service),
) -> SuccessResponse[UserResponse]:
    upload = await storage_service.upload_image(file)
    profile = await service.update_avatar(current_user, upload.url)
    return SuccessResponse(message="Avatar updated", data=profile)
