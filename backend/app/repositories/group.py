"""Group repository."""

from sqlalchemy import select

from app.models.group import Group
from app.repositories.base import BaseRepository


class GroupRepository(BaseRepository[Group]):
    model = Group

    async def get_by_invite_code(self, invite_code: str) -> Group | None:
        stmt = select(Group).where(Group.invite_code == invite_code)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()
