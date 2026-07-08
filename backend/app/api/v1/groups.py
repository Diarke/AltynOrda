"""Group ("Orda") API routes."""

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import UserOrAdmin
from app.dependencies.services import get_group_service
from app.schemas.common import SuccessResponse
from app.schemas.group import (
    GroupCreateRequest,
    GroupJoinRequest,
    GroupMemberResponse,
    GroupResponse,
    LeaderboardEntryResponse,
)
from app.services.group import GroupService

router = APIRouter(prefix="/groups", tags=["Groups"])


@router.post("/create", response_model=SuccessResponse[GroupResponse], summary="Create an Orda")
async def create_group(
    data: GroupCreateRequest,
    current_user: UserOrAdmin,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> SuccessResponse[GroupResponse]:
    group = await service.create_group(current_user, data.name)
    return SuccessResponse(message="Orda created", data=group)


@router.post("/join", response_model=SuccessResponse[GroupResponse], summary="Join an Orda by invite code")
async def join_group(
    data: GroupJoinRequest,
    current_user: UserOrAdmin,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> SuccessResponse[GroupResponse]:
    group = await service.join_group(current_user, data.invite_code)
    return SuccessResponse(message="Joined Orda", data=group)


@router.get("/mine", response_model=SuccessResponse[list[GroupResponse]], summary="List the current user's Ordas")
async def list_my_groups(
    current_user: UserOrAdmin,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> SuccessResponse[list[GroupResponse]]:
    groups = await service.get_my_groups(current_user)
    return SuccessResponse(data=groups)


@router.get("/{group_id}", response_model=SuccessResponse[GroupResponse], summary="Get an Orda")
async def get_group(
    group_id: uuid.UUID,
    current_user: UserOrAdmin,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> SuccessResponse[GroupResponse]:
    group = await service.get_group(group_id)
    return SuccessResponse(data=group)


@router.get(
    "/{group_id}/members",
    response_model=SuccessResponse[list[GroupMemberResponse]],
    summary="List an Orda's members",
)
async def get_group_members(
    group_id: uuid.UUID,
    current_user: UserOrAdmin,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> SuccessResponse[list[GroupMemberResponse]]:
    members = await service.get_members(group_id)
    return SuccessResponse(data=members)


@router.get(
    "/{group_id}/leaderboard",
    response_model=SuccessResponse[list[LeaderboardEntryResponse]],
    summary="Get an Orda's XP leaderboard",
)
async def get_group_leaderboard(
    group_id: uuid.UUID,
    current_user: UserOrAdmin,
    service: Annotated[GroupService, Depends(get_group_service)],
) -> SuccessResponse[list[LeaderboardEntryResponse]]:
    leaderboard = await service.get_leaderboard(group_id)
    return SuccessResponse(data=leaderboard)
