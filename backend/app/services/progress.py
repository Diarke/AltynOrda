"""Progress tracking service."""

import uuid

from app.core.unit_of_work import UnitOfWork
from app.enums import ProgressType, QuestStatus
from app.exceptions import ConflictException, NotFoundException
from app.models.progress import Progress
from app.models.user import User
from app.schemas.progress import (
    ProgressCreateRequest,
    ProgressResponse,
    ProgressUpdateRequest,
    UserProgressSummary,
)


class ProgressService:
    """User progress across quests, artifacts, and cities."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def get_user_progress(self, user: User) -> UserProgressSummary:
        records = await self._uow.progress.get_by_user(user.id)
        completed = sum(1 for r in records if r.status == QuestStatus.COMPLETED)
        in_progress = sum(1 for r in records if r.status == QuestStatus.IN_PROGRESS)
        total = len(records)
        completion_percent = (completed / total * 100) if total > 0 else 0.0

        return UserProgressSummary(
            total_completed=completed,
            total_in_progress=in_progress,
            completion_percent=round(completion_percent, 2),
            records=[self._to_response(r) for r in records],
        )

    async def create_progress(self, user: User, data: ProgressCreateRequest) -> ProgressResponse:
        existing = await self._uow.progress.get_user_entity_progress(
            user.id, data.entity_type, data.entity_id
        )
        if existing is not None:
            raise ConflictException("Progress record already exists for this entity")

        await self._validate_entity(data.entity_type, data.entity_id)

        progress = Progress(
            user_id=user.id,
            entity_type=data.entity_type,
            entity_id=data.entity_id,
            status=data.status,
            score=data.score,
            notes=data.notes,
        )
        created = await self._uow.progress.create(progress)
        return self._to_response(created)

    async def update_progress(
        self, user: User, progress_id: uuid.UUID, data: ProgressUpdateRequest
    ) -> ProgressResponse:
        progress = await self._uow.progress.get_by_id(progress_id)
        if progress is None or progress.user_id != user.id:
            raise NotFoundException("Progress record not found")

        if data.status is not None:
            progress.status = data.status
        if data.score is not None:
            progress.score = data.score
        if data.notes is not None:
            progress.notes = data.notes

        updated = await self._uow.progress.update(progress)
        return self._to_response(updated)

    async def _validate_entity(self, entity_type: ProgressType, entity_id: uuid.UUID) -> None:
        repo_map = {
            ProgressType.QUEST: self._uow.quests,
            ProgressType.ARTIFACT: self._uow.artifacts,
            ProgressType.CITY: self._uow.cities,
        }
        repo = repo_map.get(entity_type)
        if repo is None:
            return
        entity = await repo.get_by_id(entity_id)
        if entity is None:
            raise NotFoundException(f"{entity_type.value} not found")

    @staticmethod
    def _to_response(progress: Progress) -> ProgressResponse:
        return ProgressResponse(
            id=progress.id,
            user_id=progress.user_id,
            entity_type=progress.entity_type,
            entity_id=progress.entity_id,
            status=progress.status,
            score=progress.score,
            notes=progress.notes,
            created_at=progress.created_at,
            updated_at=progress.updated_at,
        )
