"""Progress API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, Query

from app.auth.dependencies import UserOrAdmin
from app.dependencies.services import get_progress_service
from app.schemas.common import SuccessResponse
from app.schemas.progress import (
    AchievementResponse,
    CoinSpendResponse,
    DailyLoginResponse,
    LeaderboardResponse,
    ProgressCreateRequest,
    ProgressResponse,
    ProgressStatsResponse,
    QuestCompletionResponse,
    UserProgressSummary,
)
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


@router.get(
    "/achievements",
    response_model=SuccessResponse[list[AchievementResponse]],
    summary="List the achievements unlocked by the current user",
)
async def list_achievements(
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
) -> SuccessResponse[list[AchievementResponse]]:
    achievements = await service.list_achievements(current_user)
    return SuccessResponse(data=achievements)


@router.get(
    "/stats",
    response_model=SuccessResponse[ProgressStatsResponse],
    summary="Get current user progression stats",
)
async def get_progress_stats(
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
) -> SuccessResponse[ProgressStatsResponse]:
    stats = await service.get_progress_stats(current_user)
    return SuccessResponse(data=stats)


@router.post(
    "/quests/{quest_id}/complete",
    response_model=SuccessResponse[QuestCompletionResponse],
    summary="Complete a quest and receive rewards",
)
async def complete_quest(
    quest_id: uuid.UUID,
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
) -> SuccessResponse[QuestCompletionResponse]:
    result = await service.complete_quest(current_user, quest_id)
    return SuccessResponse(message="Quest completed", data=result)


@router.post(
    "/daily-login",
    response_model=SuccessResponse[DailyLoginResponse],
    summary="Claim daily login rewards",
)
async def claim_daily_login(
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
) -> SuccessResponse[DailyLoginResponse]:
    result = await service.claim_daily_login(current_user)
    return SuccessResponse(message="Daily login reward collected", data=result)


@router.post(
    "/spend-coins",
    response_model=SuccessResponse[CoinSpendResponse],
    summary="Spend coins on a cosmetic or feature unlock",
)
async def spend_coins(
    current_user: UserOrAdmin,
    service: Annotated[ProgressService, Depends(get_progress_service)],
    amount: int = Query(default=1, ge=1),
    reason: str = Query(default="Item unlocked"),
) -> SuccessResponse[CoinSpendResponse]:
    result = await service.spend_coins(current_user, amount, reason)
    return SuccessResponse(message="Coins spent", data=result)


@router.get(
    "/leaderboard",
    response_model=SuccessResponse[LeaderboardResponse],
    summary="Get the top players by progression metrics",
)
async def get_leaderboard(
    service: Annotated[ProgressService, Depends(get_progress_service)],
    limit: int = Query(default=10, ge=1, le=50),
) -> SuccessResponse[LeaderboardResponse]:
    leaderboard = await service.get_leaderboard(limit=limit)
    return SuccessResponse(data=leaderboard)
