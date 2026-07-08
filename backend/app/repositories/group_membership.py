"""Group membership repository."""

import uuid

from sqlalchemy import func, select

from app.enums import ProgressType, QuestStatus
from app.models.group_membership import GroupMembership
from app.models.progress import Progress
from app.models.user import User
from app.repositories.base import BaseRepository


class GroupMembershipRepository(BaseRepository[GroupMembership]):
    model = GroupMembership

    async def get(self, user_id: uuid.UUID, group_id: uuid.UUID) -> GroupMembership | None:
        stmt = select(GroupMembership).where(
            GroupMembership.user_id == user_id, GroupMembership.group_id == group_id
        )
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def count_members(self, group_id: uuid.UUID) -> int:
        stmt = (
            select(func.count())
            .select_from(GroupMembership)
            .where(GroupMembership.group_id == group_id)
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def list_members_with_users(
        self, group_id: uuid.UUID
    ) -> list[tuple[GroupMembership, User]]:
        stmt = (
            select(GroupMembership, User)
            .join(User, User.id == GroupMembership.user_id)
            .where(GroupMembership.group_id == group_id)
            .order_by(GroupMembership.joined_at.asc())
        )
        result = await self.session.execute(stmt)
        return [(membership, user) for membership, user in result.all()]

    async def list_leaderboard_rows(self, group_id: uuid.UUID) -> list[tuple[User, int]]:
        """Group members ranked by XP, each paired with their total completed-quest
        count (a global stat, not scoped to the group — quests aren't group-scoped).
        """
        completed_quests = (
            select(
                Progress.user_id.label("user_id"),
                func.count().label("completed_quests"),
            )
            .where(Progress.entity_type == ProgressType.QUEST, Progress.status == QuestStatus.COMPLETED)
            .group_by(Progress.user_id)
            .subquery()
        )
        stmt = (
            select(User, func.coalesce(completed_quests.c.completed_quests, 0))
            .join(GroupMembership, GroupMembership.user_id == User.id)
            .outerjoin(completed_quests, completed_quests.c.user_id == User.id)
            .where(GroupMembership.group_id == group_id)
            .order_by(User.xp.desc())
        )
        result = await self.session.execute(stmt)
        return [(user, completed) for user, completed in result.all()]

    async def list_group_ids_for_user(self, user_id: uuid.UUID) -> list[uuid.UUID]:
        stmt = select(GroupMembership.group_id).where(GroupMembership.user_id == user_id)
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
