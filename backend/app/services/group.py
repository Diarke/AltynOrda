"""Group ("Orda") service."""

import secrets
import uuid
from datetime import UTC, datetime

from app.core.unit_of_work import UnitOfWork
from app.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.group import Group
from app.models.group_membership import GroupMembership
from app.models.user import User
from app.schemas.group import (
    GroupMemberResponse,
    GroupResponse,
    LeaderboardEntryResponse,
)


class GroupService:
    """Create/join groups and read their members and leaderboard."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def create_group(self, user: User, name: str) -> GroupResponse:
        group = Group(name=name, owner_id=user.id, invite_code=await self._generate_invite_code())
        created = await self._uow.groups.create(group)
        await self._uow.group_memberships.create(
            GroupMembership(user_id=user.id, group_id=created.id, joined_at=datetime.now(UTC))
        )
        return await self._to_response(created)

    async def join_group(self, user: User, invite_code: str) -> GroupResponse:
        group = await self._uow.groups.get_by_invite_code(invite_code.strip().upper())
        if group is None:
            raise NotFoundException("Invalid invite code")

        existing = await self._uow.group_memberships.get(user.id, group.id)
        if existing is not None:
            raise ConflictException("Already a member of this Orda")

        await self._uow.group_memberships.create(
            GroupMembership(user_id=user.id, group_id=group.id, joined_at=datetime.now(UTC))
        )
        return await self._to_response(group)

    async def get_group(self, group_id: uuid.UUID) -> GroupResponse:
        group = await self._get_group_or_404(group_id)
        return await self._to_response(group)

    async def get_members(self, group_id: uuid.UUID) -> list[GroupMemberResponse]:
        group = await self._get_group_or_404(group_id)
        rows = await self._uow.group_memberships.list_members_with_users(group_id)
        return [
            GroupMemberResponse(
                user_id=member.user_id,
                username=member_user.username,
                avatar_url=member_user.avatar_url,
                level=member_user.level,
                xp=member_user.xp,
                is_owner=member_user.id == group.owner_id,
                joined_at=member.joined_at,
            )
            for member, member_user in rows
        ]

    async def get_leaderboard(self, group_id: uuid.UUID) -> list[LeaderboardEntryResponse]:
        await self._get_group_or_404(group_id)
        rows = await self._uow.group_memberships.list_leaderboard_rows(group_id)
        return [
            LeaderboardEntryResponse(
                rank=index + 1,
                user_id=member_user.id,
                username=member_user.username,
                avatar_url=member_user.avatar_url,
                level=member_user.level,
                xp=member_user.xp,
                coins=member_user.coins,
                completed_quests=completed_quests,
            )
            for index, (member_user, completed_quests) in enumerate(rows)
        ]

    async def get_my_groups(self, user: User) -> list[GroupResponse]:
        group_ids = await self._uow.group_memberships.list_group_ids_for_user(user.id)
        responses = []
        for group_id in group_ids:
            group = await self._uow.groups.get_by_id(group_id)
            if group is not None:
                responses.append(await self._to_response(group))
        return responses

    async def _get_group_or_404(self, group_id: uuid.UUID) -> Group:
        group = await self._uow.groups.get_by_id(group_id)
        if group is None:
            raise NotFoundException("Orda not found")
        return group

    async def _generate_invite_code(self) -> str:
        for _ in range(10):
            code = secrets.token_hex(4).upper()
            if await self._uow.groups.get_by_invite_code(code) is None:
                return code
        raise ValidationException("Could not generate a unique invite code, try again")

    async def _to_response(self, group: Group) -> GroupResponse:
        member_count = await self._uow.group_memberships.count_members(group.id)
        return GroupResponse(
            id=group.id,
            name=group.name,
            owner_id=group.owner_id,
            invite_code=group.invite_code,
            member_count=member_count,
            created_at=group.created_at,
        )
