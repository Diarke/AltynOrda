"""User service."""

import uuid

from app.core.unit_of_work import UnitOfWork
from app.exceptions import NotFoundException
from app.models.user import User
from app.schemas.auth import UserResponse, UserUpdateRequest


class UserService:
    """User profile management."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def get_profile(self, user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            bio=user.bio,
        )

    async def update_profile(self, user: User, data: UserUpdateRequest) -> UserResponse:
        if data.full_name is not None:
            user.full_name = data.full_name
        if data.bio is not None:
            user.bio = data.bio
        updated = await self._uow.users.update(user)
        return await self.get_profile(updated)

    async def get_by_id(self, user_id: uuid.UUID) -> UserResponse:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundException("User not found")
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            bio=user.bio,
        )
