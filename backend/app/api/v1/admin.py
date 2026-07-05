"""Admin API routes."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile, status

from app.auth.dependencies import AdminUser
from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.dependencies.services import get_admin_service, get_storage_service
from app.schemas.admin import (
    AdminArtifactCreateRequest,
    AdminCityCreateRequest,
    AdminGamificationSettingCreateRequest,
    AdminGalleryImageCreateRequest,
    AdminHomepageContentCreateRequest,
    AdminQuestCreateRequest,
    AdminStatisticsResponse,
    AdminSystemSettingCreateRequest,
    AdminUploadResponse,
    AdminUserUpdateRequest,
)
from app.schemas.artifact import ArtifactResponse
from app.schemas.auth import UserResponse
from app.schemas.city import CityResponse
from app.schemas.common import PaginatedMeta, PaginatedResponse, SuccessResponse
from app.schemas.quest import QuestResponse
from app.services.admin import AdminService
from app.services.storage import StorageService

router = APIRouter(prefix="/admin", tags=["Admin"])


@router.get(
    "/statistics",
    response_model=SuccessResponse[AdminStatisticsResponse],
    summary="Get admin dashboard statistics",
)
async def get_statistics(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminStatisticsResponse]:
    statistics = await service.get_statistics()
    return SuccessResponse(data=statistics)


@router.get(
    "/users",
    response_model=PaginatedResponse[UserResponse],
    summary="List users",
)
async def list_users(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=20, ge=1, le=100),
) -> PaginatedResponse[UserResponse]:
    offset = (page - 1) * page_size
    users = await service.list_users(offset=offset, limit=page_size)
    total = await service.count_users()
    meta = PaginatedMeta(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )
    return PaginatedResponse(data=users, meta=meta)


@router.get(
    "/users/{user_id}",
    response_model=SuccessResponse[UserResponse],
    summary="Get a user by ID",
)
async def get_user(
    user_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[UserResponse]:
    user = await service.get_user(user_id)
    return SuccessResponse(data=user)


@router.patch(
    "/users/{user_id}",
    response_model=SuccessResponse[UserResponse],
    summary="Update a user account",
)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[UserResponse]:
    user = await service.update_user(user_id, data)
    return SuccessResponse(message="User updated", data=user)


@router.delete(
    "/users/{user_id}",
    response_model=SuccessResponse[None],
    summary="Delete a user account",
)
async def delete_user(
    user_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_user(user_id)
    return SuccessResponse(message="User deleted")


@router.post(
    "/cities",
    response_model=SuccessResponse[CityResponse],
    summary="Create a city",
)
async def create_city(
    data: AdminCityCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CityResponse]:
    city = await service.create_city(data)
    return SuccessResponse(message="City created", data=city)


@router.post(
    "/artifacts",
    response_model=SuccessResponse[ArtifactResponse],
    summary="Create an artifact",
)
async def create_artifact(
    data: AdminArtifactCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[ArtifactResponse]:
    artifact = await service.create_artifact(data)
    return SuccessResponse(message="Artifact created", data=artifact)


@router.post(
    "/quests",
    response_model=SuccessResponse[QuestResponse],
    summary="Create a quest",
)
async def create_quest(
    data: AdminQuestCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[QuestResponse]:
    quest = await service.create_quest(data)
    return SuccessResponse(message="Quest created", data=quest)


@router.post(
    "/upload",
    response_model=SuccessResponse[AdminUploadResponse],
    summary="Upload an image asset",
)
async def upload_image(
    _admin_user: AdminUser,
    file: UploadFile = File(...),
    storage_service: StorageService = Depends(get_storage_service),
) -> SuccessResponse[AdminUploadResponse]:
    upload = await storage_service.upload_image(file)
    return SuccessResponse(message="Image uploaded", data=upload)


@router.post(
    "/gallery-images",
    response_model=SuccessResponse[dict[str, str]],
    summary="Create a gallery image entry",
)
async def create_gallery_image(
    data: AdminGalleryImageCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[dict[str, str]]:
    item = await service.create_gallery_image(data)
    return SuccessResponse(message="Gallery image created", data={"id": str(item.id)})


@router.post(
    "/homepage-content",
    response_model=SuccessResponse[dict[str, str]],
    summary="Create homepage content",
)
async def create_homepage_content(
    data: AdminHomepageContentCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[dict[str, str]]:
    item = await service.create_homepage_content(data)
    return SuccessResponse(message="Homepage content created", data={"id": str(item.id)})


@router.post(
    "/gamification-settings",
    response_model=SuccessResponse[dict[str, str]],
    summary="Create a gamification setting",
)
async def create_gamification_setting(
    data: AdminGamificationSettingCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[dict[str, str]]:
    item = await service.create_gamification_setting(data)
    return SuccessResponse(message="Gamification setting created", data={"id": str(item.id)})


@router.post(
    "/system-settings",
    response_model=SuccessResponse[dict[str, str]],
    summary="Create a system setting",
)
async def create_system_setting(
    data: AdminSystemSettingCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[dict[str, str]]:
    item = await service.create_system_setting(data)
    return SuccessResponse(message="System setting created", data={"id": str(item.id)})
