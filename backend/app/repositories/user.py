"""User repository."""

from sqlalchemy import func, select

from app.enums import UserRole
from app.models.user import User
from app.repositories.base import BaseRepository


class UserRepository(BaseRepository[User]):
    model = User

    def _search_stmt(self, query: str | None, role: UserRole | None, is_active: bool | None):
        stmt = select(User)
        if query:
            like = f"%{query}%"
            stmt = stmt.where((User.username.ilike(like)) | (User.email.ilike(like)))
        if role is not None:
            stmt = stmt.where(User.role == role)
        if is_active is not None:
            stmt = stmt.where(User.is_active == is_active)
        return stmt

    async def search(
        self,
        *,
        query: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[User]:
        stmt = (
            self._search_stmt(query, role, is_active)
            .order_by(User.created_at.desc())
            .offset(offset)
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())

    async def count_search(
        self,
        *,
        query: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> int:
        stmt = select(func.count()).select_from(
            self._search_stmt(query, role, is_active).subquery()
        )
        result = await self.session.execute(stmt)
        return result.scalar_one()

    async def get_by_email(self, email: str) -> User | None:
        stmt = select(User).where(User.email == email)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_by_username(self, username: str) -> User | None:
        stmt = select(User).where(User.username == username)
        result = await self.session.execute(stmt)
        return result.scalar_one_or_none()

    async def email_exists(self, email: str) -> bool:
        user = await self.get_by_email(email)
        return user is not None

    async def username_exists(self, username: str) -> bool:
        user = await self.get_by_username(username)
        return user is not None

    async def get_leaderboard(self, *, limit: int = 10) -> list[User]:
        stmt = (
            select(User)
            .order_by(User.xp.desc(), User.coins.desc(), User.streak_days.desc())
            .limit(limit)
        )
        result = await self.session.execute(stmt)
        return list(result.scalars().all())
