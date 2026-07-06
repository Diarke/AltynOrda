"""Admin API routes."""

from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, File, Query, UploadFile

from app.auth.dependencies import AdminUser
from app.dependencies.services import get_admin_service, get_storage_service
from app.enums import Language, UserRole
from app.schemas.admin import (
    AdminAchievementCreateRequest,
    AdminAchievementUpdateRequest,
    AdminAIUsageResponse,
    AdminArtifactCreateRequest,
    AdminArtifactUpdateRequest,
    AdminCertificateCreateRequest,
    AdminCertificatesAnalyticsResponse,
    AdminCertificateUpdateRequest,
    AdminCityCreateRequest,
    AdminCityUpdateRequest,
    AdminCoinEconomyResponse,
    AdminGalleryImageCreateRequest,
    AdminGalleryImageResponse,
    AdminGalleryImageUpdateRequest,
    AdminGamificationSettingCreateRequest,
    AdminGamificationSettingResponse,
    AdminGamificationSettingUpdateRequest,
    AdminHistoricalDocumentCreateRequest,
    AdminHistoricalDocumentResponse,
    AdminHistoricalDocumentUpdateRequest,
    AdminHomepageContentCreateRequest,
    AdminHomepageContentResponse,
    AdminHomepageContentUpdateRequest,
    AdminQuestCompletionResponse,
    AdminQuestCreateRequest,
    AdminQuestResponse,
    AdminQuestUpdateRequest,
    AdminRecentActivityResponse,
    AdminStatisticsResponse,
    AdminSystemPromptResponse,
    AdminSystemPromptUpdateRequest,
    AdminSystemSettingCreateRequest,
    AdminSystemSettingResponse,
    AdminSystemSettingUpdateRequest,
    AdminUploadResponse,
    AdminUserGrowthResponse,
    AdminUserResponse,
    AdminUserUpdateRequest,
    AdminXPStatsResponse,
)
from app.schemas.artifact import ArtifactResponse
from app.schemas.certificate import CertificateResponse
from app.schemas.city import CityResponse
from app.schemas.common import PaginatedMeta, PaginatedResponse, SuccessResponse
from app.schemas.progress import AchievementResponse
from app.schemas.suggested_prompt import (
    AdminSuggestedPromptCreateRequest,
    AdminSuggestedPromptUpdateRequest,
    SuggestedPromptResponse,
)
from app.services.admin import AdminService
from app.services.storage import StorageService

router = APIRouter(prefix="/admin", tags=["Admin"])

PageQuery = Query(default=1, ge=1)
PageSizeQuery = Query(default=20, ge=1, le=100)


def _meta(page: int, page_size: int, total: int) -> PaginatedMeta:
    return PaginatedMeta(
        page=page,
        page_size=page_size,
        total=total,
        total_pages=max(1, (total + page_size - 1) // page_size),
    )


# ─── Statistics & analytics ─────────────────────────────────────────────────


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
    "/analytics/user-growth",
    response_model=SuccessResponse[AdminUserGrowthResponse],
    summary="User signups over time",
)
async def get_user_growth(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    days: int = Query(default=30, ge=1, le=365),
) -> SuccessResponse[AdminUserGrowthResponse]:
    return SuccessResponse(data=await service.get_user_growth(days=days))


@router.get(
    "/analytics/quest-completion",
    response_model=SuccessResponse[AdminQuestCompletionResponse],
    summary="Quest completion trends",
)
async def get_quest_completion_analytics(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    days: int = Query(default=30, ge=1, le=365),
) -> SuccessResponse[AdminQuestCompletionResponse]:
    return SuccessResponse(data=await service.get_quest_completion_analytics(days=days))


@router.get(
    "/analytics/ai-usage",
    response_model=SuccessResponse[AdminAIUsageResponse],
    summary="AI historian usage over time",
)
async def get_ai_usage_analytics(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    days: int = Query(default=30, ge=1, le=365),
) -> SuccessResponse[AdminAIUsageResponse]:
    return SuccessResponse(data=await service.get_ai_usage_analytics(days=days))


@router.get(
    "/analytics/xp-stats",
    response_model=SuccessResponse[AdminXPStatsResponse],
    summary="XP distribution across users",
)
async def get_xp_stats(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminXPStatsResponse]:
    return SuccessResponse(data=await service.get_xp_stats())


@router.get(
    "/analytics/coin-economy",
    response_model=SuccessResponse[AdminCoinEconomyResponse],
    summary="Coin economy snapshot",
)
async def get_coin_economy(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminCoinEconomyResponse]:
    return SuccessResponse(data=await service.get_coin_economy())


@router.get(
    "/analytics/certificates",
    response_model=SuccessResponse[AdminCertificatesAnalyticsResponse],
    summary="Certificates issued over time",
)
async def get_certificates_analytics(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    days: int = Query(default=30, ge=1, le=365),
) -> SuccessResponse[AdminCertificatesAnalyticsResponse]:
    return SuccessResponse(data=await service.get_certificates_analytics(days=days))


@router.get(
    "/analytics/recent-activity",
    response_model=SuccessResponse[AdminRecentActivityResponse],
    summary="Recent platform activity feed",
)
async def get_recent_activity(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    limit: int = Query(default=20, ge=1, le=100),
) -> SuccessResponse[AdminRecentActivityResponse]:
    return SuccessResponse(data=await service.get_recent_activity(limit=limit))


# ─── Users ───────────────────────────────────────────────────────────────────


@router.get("/users", response_model=PaginatedResponse[AdminUserResponse], summary="List users")
async def list_users(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
    q: str | None = Query(default=None, description="Search by username or email"),
    role: UserRole | None = None,
    is_active: bool | None = None,
) -> PaginatedResponse[AdminUserResponse]:
    offset = (page - 1) * page_size
    users = await service.list_users(
        query=q, role=role, is_active=is_active, offset=offset, limit=page_size
    )
    total = await service.count_users(query=q, role=role, is_active=is_active)
    return PaginatedResponse(data=users, meta=_meta(page, page_size, total))


@router.get(
    "/users/{user_id}",
    response_model=SuccessResponse[AdminUserResponse],
    summary="Get a user by ID",
)
async def get_user(
    user_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminUserResponse]:
    user = await service.get_user(user_id)
    return SuccessResponse(data=user)


@router.patch(
    "/users/{user_id}",
    response_model=SuccessResponse[AdminUserResponse],
    summary="Update a user account",
)
async def update_user(
    user_id: uuid.UUID,
    data: AdminUserUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminUserResponse]:
    user = await service.update_user(user_id, data)
    return SuccessResponse(message="User updated", data=user)


@router.delete(
    "/users/{user_id}", response_model=SuccessResponse[None], summary="Delete a user account"
)
async def delete_user(
    user_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_user(user_id)
    return SuccessResponse(message="User deleted")


# ─── Cities ──────────────────────────────────────────────────────────────────


@router.get("/cities", response_model=PaginatedResponse[CityResponse], summary="List cities")
async def list_cities(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[CityResponse]:
    offset = (page - 1) * page_size
    cities = await service.list_cities(offset=offset, limit=page_size)
    total = await service.count_cities()
    return PaginatedResponse(data=cities, meta=_meta(page, page_size, total))


@router.get(
    "/cities/{city_id}", response_model=SuccessResponse[CityResponse], summary="Get a city by ID"
)
async def get_city(
    city_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CityResponse]:
    return SuccessResponse(data=await service.get_city(city_id))


@router.post("/cities", response_model=SuccessResponse[CityResponse], summary="Create a city")
async def create_city(
    data: AdminCityCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CityResponse]:
    city = await service.create_city(data)
    return SuccessResponse(message="City created", data=city)


@router.patch(
    "/cities/{city_id}", response_model=SuccessResponse[CityResponse], summary="Update a city"
)
async def update_city(
    city_id: uuid.UUID,
    data: AdminCityUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CityResponse]:
    city = await service.update_city(city_id, data)
    return SuccessResponse(message="City updated", data=city)


@router.delete("/cities/{city_id}", response_model=SuccessResponse[None], summary="Delete a city")
async def delete_city(
    city_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_city(city_id)
    return SuccessResponse(message="City deleted")


# ─── Artifacts ───────────────────────────────────────────────────────────────


@router.get(
    "/artifacts", response_model=PaginatedResponse[ArtifactResponse], summary="List artifacts"
)
async def list_artifacts(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[ArtifactResponse]:
    offset = (page - 1) * page_size
    artifacts = await service.list_artifacts(offset=offset, limit=page_size)
    total = await service.count_artifacts()
    return PaginatedResponse(data=artifacts, meta=_meta(page, page_size, total))


@router.get(
    "/artifacts/{artifact_id}",
    response_model=SuccessResponse[ArtifactResponse],
    summary="Get an artifact by ID",
)
async def get_artifact(
    artifact_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[ArtifactResponse]:
    return SuccessResponse(data=await service.get_artifact(artifact_id))


@router.post(
    "/artifacts", response_model=SuccessResponse[ArtifactResponse], summary="Create an artifact"
)
async def create_artifact(
    data: AdminArtifactCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[ArtifactResponse]:
    artifact = await service.create_artifact(data)
    return SuccessResponse(message="Artifact created", data=artifact)


@router.patch(
    "/artifacts/{artifact_id}",
    response_model=SuccessResponse[ArtifactResponse],
    summary="Update an artifact",
)
async def update_artifact(
    artifact_id: uuid.UUID,
    data: AdminArtifactUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[ArtifactResponse]:
    artifact = await service.update_artifact(artifact_id, data)
    return SuccessResponse(message="Artifact updated", data=artifact)


@router.delete(
    "/artifacts/{artifact_id}", response_model=SuccessResponse[None], summary="Delete an artifact"
)
async def delete_artifact(
    artifact_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_artifact(artifact_id)
    return SuccessResponse(message="Artifact deleted")


# ─── Quests ──────────────────────────────────────────────────────────────────


@router.get("/quests", response_model=PaginatedResponse[AdminQuestResponse], summary="List quests")
async def list_quests(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[AdminQuestResponse]:
    offset = (page - 1) * page_size
    quests = await service.list_quests(offset=offset, limit=page_size)
    total = await service.count_quests()
    return PaginatedResponse(data=quests, meta=_meta(page, page_size, total))


@router.get(
    "/quests/{quest_id}",
    response_model=SuccessResponse[AdminQuestResponse],
    summary="Get a quest by ID",
)
async def get_quest(
    quest_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminQuestResponse]:
    return SuccessResponse(data=await service.get_quest(quest_id))


@router.post(
    "/quests", response_model=SuccessResponse[AdminQuestResponse], summary="Create a quest"
)
async def create_quest(
    data: AdminQuestCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminQuestResponse]:
    quest = await service.create_quest(data)
    return SuccessResponse(message="Quest created", data=quest)


@router.patch(
    "/quests/{quest_id}",
    response_model=SuccessResponse[AdminQuestResponse],
    summary="Update a quest",
)
async def update_quest(
    quest_id: uuid.UUID,
    data: AdminQuestUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminQuestResponse]:
    quest = await service.update_quest(quest_id, data)
    return SuccessResponse(message="Quest updated", data=quest)


@router.delete("/quests/{quest_id}", response_model=SuccessResponse[None], summary="Delete a quest")
async def delete_quest(
    quest_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_quest(quest_id)
    return SuccessResponse(message="Quest deleted")


# ─── Gallery images ──────────────────────────────────────────────────────────


@router.get(
    "/gallery-images",
    response_model=PaginatedResponse[AdminGalleryImageResponse],
    summary="List gallery images",
)
async def list_gallery_images(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
    language: Language | None = None,
    group_key: uuid.UUID | None = None,
) -> PaginatedResponse[AdminGalleryImageResponse]:
    offset = (page - 1) * page_size
    images = await service.list_gallery_images(
        language=language, group_key=group_key, offset=offset, limit=page_size
    )
    total = await service.count_gallery_images(language=language, group_key=group_key)
    return PaginatedResponse(data=images, meta=_meta(page, page_size, total))


@router.get(
    "/gallery-images/{image_id}",
    response_model=SuccessResponse[AdminGalleryImageResponse],
    summary="Get a gallery image by ID",
)
async def get_gallery_image(
    image_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminGalleryImageResponse]:
    return SuccessResponse(data=await service.get_gallery_image(image_id))


@router.post(
    "/gallery-images",
    response_model=SuccessResponse[AdminGalleryImageResponse],
    summary="Create a gallery image entry",
)
async def create_gallery_image(
    data: AdminGalleryImageCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminGalleryImageResponse]:
    item = await service.create_gallery_image(data)
    return SuccessResponse(message="Gallery image created", data=item)


@router.patch(
    "/gallery-images/{image_id}",
    response_model=SuccessResponse[AdminGalleryImageResponse],
    summary="Update a gallery image",
)
async def update_gallery_image(
    image_id: uuid.UUID,
    data: AdminGalleryImageUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminGalleryImageResponse]:
    item = await service.update_gallery_image(image_id, data)
    return SuccessResponse(message="Gallery image updated", data=item)


@router.delete(
    "/gallery-images/{image_id}",
    response_model=SuccessResponse[None],
    summary="Delete a gallery image",
)
async def delete_gallery_image(
    image_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    storage_service: Annotated[StorageService, Depends(get_storage_service)],
) -> SuccessResponse[None]:
    image = await service.delete_gallery_image(image_id)
    await storage_service.delete_by_url(image.image_url)
    return SuccessResponse(message="Gallery image deleted")


# ─── Homepage content ────────────────────────────────────────────────────────


@router.get(
    "/homepage-content",
    response_model=PaginatedResponse[AdminHomepageContentResponse],
    summary="List homepage content blocks",
)
async def list_homepage_content(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
    section: str | None = None,
    language: Language | None = None,
) -> PaginatedResponse[AdminHomepageContentResponse]:
    offset = (page - 1) * page_size
    items = await service.list_homepage_content(
        section=section, language=language, offset=offset, limit=page_size
    )
    total = await service.count_homepage_content(section=section, language=language)
    return PaginatedResponse(data=items, meta=_meta(page, page_size, total))


@router.get(
    "/homepage-content/{content_id}",
    response_model=SuccessResponse[AdminHomepageContentResponse],
    summary="Get a homepage content block by ID",
)
async def get_homepage_content(
    content_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminHomepageContentResponse]:
    return SuccessResponse(data=await service.get_homepage_content(content_id))


@router.post(
    "/homepage-content",
    response_model=SuccessResponse[AdminHomepageContentResponse],
    summary="Create homepage content",
)
async def create_homepage_content(
    data: AdminHomepageContentCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminHomepageContentResponse]:
    item = await service.create_homepage_content(data)
    return SuccessResponse(message="Homepage content created", data=item)


@router.patch(
    "/homepage-content/{content_id}",
    response_model=SuccessResponse[AdminHomepageContentResponse],
    summary="Update homepage content",
)
async def update_homepage_content(
    content_id: uuid.UUID,
    data: AdminHomepageContentUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminHomepageContentResponse]:
    item = await service.update_homepage_content(content_id, data)
    return SuccessResponse(message="Homepage content updated", data=item)


@router.delete(
    "/homepage-content/{content_id}",
    response_model=SuccessResponse[None],
    summary="Delete homepage content",
)
async def delete_homepage_content(
    content_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_homepage_content(content_id)
    return SuccessResponse(message="Homepage content deleted")


# ─── Gamification settings ───────────────────────────────────────────────────


@router.get(
    "/gamification-settings",
    response_model=PaginatedResponse[AdminGamificationSettingResponse],
    summary="List gamification settings",
)
async def list_gamification_settings(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[AdminGamificationSettingResponse]:
    offset = (page - 1) * page_size
    settings = await service.list_gamification_settings(offset=offset, limit=page_size)
    total = await service.count_gamification_settings()
    return PaginatedResponse(data=settings, meta=_meta(page, page_size, total))


@router.post(
    "/gamification-settings",
    response_model=SuccessResponse[AdminGamificationSettingResponse],
    summary="Create a gamification setting",
)
async def create_gamification_setting(
    data: AdminGamificationSettingCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminGamificationSettingResponse]:
    item = await service.create_gamification_setting(data)
    return SuccessResponse(message="Gamification setting created", data=item)


@router.patch(
    "/gamification-settings/{setting_id}",
    response_model=SuccessResponse[AdminGamificationSettingResponse],
    summary="Update a gamification setting",
)
async def update_gamification_setting(
    setting_id: uuid.UUID,
    data: AdminGamificationSettingUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminGamificationSettingResponse]:
    item = await service.update_gamification_setting(setting_id, data)
    return SuccessResponse(message="Gamification setting updated", data=item)


@router.delete(
    "/gamification-settings/{setting_id}",
    response_model=SuccessResponse[None],
    summary="Delete a gamification setting",
)
async def delete_gamification_setting(
    setting_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_gamification_setting(setting_id)
    return SuccessResponse(message="Gamification setting deleted")


# ─── System settings ─────────────────────────────────────────────────────────


@router.get(
    "/system-settings",
    response_model=PaginatedResponse[AdminSystemSettingResponse],
    summary="List system settings",
)
async def list_system_settings(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[AdminSystemSettingResponse]:
    offset = (page - 1) * page_size
    settings = await service.list_system_settings(offset=offset, limit=page_size)
    total = await service.count_system_settings()
    return PaginatedResponse(data=settings, meta=_meta(page, page_size, total))


@router.post(
    "/system-settings",
    response_model=SuccessResponse[AdminSystemSettingResponse],
    summary="Create a system setting",
)
async def create_system_setting(
    data: AdminSystemSettingCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminSystemSettingResponse]:
    item = await service.create_system_setting(data)
    return SuccessResponse(message="System setting created", data=item)


# NOTE: this literal path must be registered before "/system-settings/{setting_id}"
# so FastAPI doesn't try to parse "ai-system-prompt" as a UUID path parameter.
@router.get(
    "/system-settings/ai-system-prompt",
    response_model=SuccessResponse[AdminSystemPromptResponse],
    summary="Get the AI historian system prompt",
)
async def get_system_prompt(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminSystemPromptResponse]:
    return SuccessResponse(data=await service.get_system_prompt())


@router.put(
    "/system-settings/ai-system-prompt",
    response_model=SuccessResponse[AdminSystemPromptResponse],
    summary="Update the AI historian system prompt",
)
async def update_system_prompt(
    data: AdminSystemPromptUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminSystemPromptResponse]:
    result = await service.set_system_prompt(data.value)
    return SuccessResponse(message="System prompt updated", data=result)


@router.patch(
    "/system-settings/{setting_id}",
    response_model=SuccessResponse[AdminSystemSettingResponse],
    summary="Update a system setting",
)
async def update_system_setting(
    setting_id: uuid.UUID,
    data: AdminSystemSettingUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminSystemSettingResponse]:
    item = await service.update_system_setting(setting_id, data)
    return SuccessResponse(message="System setting updated", data=item)


@router.delete(
    "/system-settings/{setting_id}",
    response_model=SuccessResponse[None],
    summary="Delete a system setting",
)
async def delete_system_setting(
    setting_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_system_setting(setting_id)
    return SuccessResponse(message="System setting deleted")


# ─── Historical documents ────────────────────────────────────────────────────


@router.get(
    "/historical-documents",
    response_model=PaginatedResponse[AdminHistoricalDocumentResponse],
    summary="List historical documents",
)
async def list_historical_documents(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[AdminHistoricalDocumentResponse]:
    offset = (page - 1) * page_size
    documents = await service.list_historical_documents(offset=offset, limit=page_size)
    total = await service.count_historical_documents()
    return PaginatedResponse(data=documents, meta=_meta(page, page_size, total))


@router.get(
    "/historical-documents/{document_id}",
    response_model=SuccessResponse[AdminHistoricalDocumentResponse],
    summary="Get a historical document by ID",
)
async def get_historical_document(
    document_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminHistoricalDocumentResponse]:
    return SuccessResponse(data=await service.get_historical_document(document_id))


@router.post(
    "/historical-documents",
    response_model=SuccessResponse[AdminHistoricalDocumentResponse],
    summary="Create a historical document (embedded into the AI index immediately)",
)
async def create_historical_document(
    data: AdminHistoricalDocumentCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminHistoricalDocumentResponse]:
    document = await service.create_historical_document(data)
    return SuccessResponse(message="Historical document created and indexed", data=document)


@router.patch(
    "/historical-documents/{document_id}",
    response_model=SuccessResponse[AdminHistoricalDocumentResponse],
    summary="Update a historical document (re-embedded into the AI index immediately)",
)
async def update_historical_document(
    document_id: uuid.UUID,
    data: AdminHistoricalDocumentUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AdminHistoricalDocumentResponse]:
    document = await service.update_historical_document(document_id, data)
    return SuccessResponse(message="Historical document updated and re-indexed", data=document)


@router.delete(
    "/historical-documents/{document_id}",
    response_model=SuccessResponse[None],
    summary="Delete a historical document",
)
async def delete_historical_document(
    document_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_historical_document(document_id)
    return SuccessResponse(message="Historical document deleted")


# ─── Certificates ────────────────────────────────────────────────────────────


@router.get(
    "/certificates",
    response_model=PaginatedResponse[CertificateResponse],
    summary="List certificates",
)
async def list_certificates(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[CertificateResponse]:
    offset = (page - 1) * page_size
    certificates = await service.list_certificates(offset=offset, limit=page_size)
    total = await service.count_certificates()
    return PaginatedResponse(data=certificates, meta=_meta(page, page_size, total))


@router.get(
    "/certificates/{certificate_id}",
    response_model=SuccessResponse[CertificateResponse],
    summary="Get a certificate by ID",
)
async def get_certificate(
    certificate_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CertificateResponse]:
    return SuccessResponse(data=await service.get_certificate(certificate_id))


@router.post(
    "/certificates",
    response_model=SuccessResponse[CertificateResponse],
    summary="Manually issue a certificate",
)
async def create_certificate(
    data: AdminCertificateCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CertificateResponse]:
    certificate = await service.create_certificate(data)
    return SuccessResponse(message="Certificate issued", data=certificate)


@router.patch(
    "/certificates/{certificate_id}",
    response_model=SuccessResponse[CertificateResponse],
    summary="Update a certificate",
)
async def update_certificate(
    certificate_id: uuid.UUID,
    data: AdminCertificateUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[CertificateResponse]:
    certificate = await service.update_certificate(certificate_id, data)
    return SuccessResponse(message="Certificate updated", data=certificate)


@router.delete(
    "/certificates/{certificate_id}",
    response_model=SuccessResponse[None],
    summary="Delete a certificate",
)
async def delete_certificate(
    certificate_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_certificate(certificate_id)
    return SuccessResponse(message="Certificate deleted")


# ─── Achievements ────────────────────────────────────────────────────────────


@router.get(
    "/achievements",
    response_model=PaginatedResponse[AchievementResponse],
    summary="List awarded achievements",
)
async def list_achievements(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[AchievementResponse]:
    offset = (page - 1) * page_size
    achievements = await service.list_achievements(offset=offset, limit=page_size)
    total = await service.count_achievements()
    return PaginatedResponse(data=achievements, meta=_meta(page, page_size, total))


@router.get(
    "/achievements/{achievement_id}",
    response_model=SuccessResponse[AchievementResponse],
    summary="Get an achievement by ID",
)
async def get_achievement(
    achievement_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AchievementResponse]:
    return SuccessResponse(data=await service.get_achievement(achievement_id))


@router.post(
    "/achievements",
    response_model=SuccessResponse[AchievementResponse],
    summary="Manually grant an achievement",
)
async def create_achievement(
    data: AdminAchievementCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AchievementResponse]:
    achievement = await service.create_achievement(data)
    return SuccessResponse(message="Achievement granted", data=achievement)


@router.patch(
    "/achievements/{achievement_id}",
    response_model=SuccessResponse[AchievementResponse],
    summary="Update an achievement",
)
async def update_achievement(
    achievement_id: uuid.UUID,
    data: AdminAchievementUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[AchievementResponse]:
    achievement = await service.update_achievement(achievement_id, data)
    return SuccessResponse(message="Achievement updated", data=achievement)


@router.delete(
    "/achievements/{achievement_id}",
    response_model=SuccessResponse[None],
    summary="Revoke an achievement",
)
async def delete_achievement(
    achievement_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_achievement(achievement_id)
    return SuccessResponse(message="Achievement revoked")


# ─── Suggested prompts ───────────────────────────────────────────────────────


@router.get(
    "/suggested-prompts",
    response_model=PaginatedResponse[SuggestedPromptResponse],
    summary="List suggested AI historian prompts",
)
async def list_suggested_prompts(
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
    page: int = PageQuery,
    page_size: int = PageSizeQuery,
) -> PaginatedResponse[SuggestedPromptResponse]:
    offset = (page - 1) * page_size
    prompts = await service.list_suggested_prompts(offset=offset, limit=page_size)
    total = await service.count_suggested_prompts()
    return PaginatedResponse(data=prompts, meta=_meta(page, page_size, total))


@router.post(
    "/suggested-prompts",
    response_model=SuccessResponse[SuggestedPromptResponse],
    summary="Create a suggested prompt",
)
async def create_suggested_prompt(
    data: AdminSuggestedPromptCreateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[SuggestedPromptResponse]:
    prompt = await service.create_suggested_prompt(data)
    return SuccessResponse(message="Suggested prompt created", data=prompt)


@router.patch(
    "/suggested-prompts/{prompt_id}",
    response_model=SuccessResponse[SuggestedPromptResponse],
    summary="Update a suggested prompt",
)
async def update_suggested_prompt(
    prompt_id: uuid.UUID,
    data: AdminSuggestedPromptUpdateRequest,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[SuggestedPromptResponse]:
    prompt = await service.update_suggested_prompt(prompt_id, data)
    return SuccessResponse(message="Suggested prompt updated", data=prompt)


@router.delete(
    "/suggested-prompts/{prompt_id}",
    response_model=SuccessResponse[None],
    summary="Delete a suggested prompt",
)
async def delete_suggested_prompt(
    prompt_id: uuid.UUID,
    _admin_user: AdminUser,
    service: Annotated[AdminService, Depends(get_admin_service)],
) -> SuccessResponse[None]:
    await service.delete_suggested_prompt(prompt_id)
    return SuccessResponse(message="Suggested prompt deleted")


# ─── Uploads ─────────────────────────────────────────────────────────────────


@router.post(
    "/upload",
    response_model=SuccessResponse[AdminUploadResponse],
    summary="Upload an image asset",
)
async def upload_image(
    _admin_user: AdminUser,
    storage_service: Annotated[StorageService, Depends(get_storage_service)],
    file: UploadFile = File(...),
) -> SuccessResponse[AdminUploadResponse]:
    upload = await storage_service.upload_image(file)
    return SuccessResponse(message="Image uploaded", data=upload)


@router.delete(
    "/upload/{key:path}",
    response_model=SuccessResponse[None],
    summary="Delete an uploaded image asset",
)
async def delete_upload(
    key: str,
    _admin_user: AdminUser,
    storage_service: Annotated[StorageService, Depends(get_storage_service)],
) -> SuccessResponse[None]:
    await storage_service.delete_image(key)
    return SuccessResponse(message="Image deleted")
