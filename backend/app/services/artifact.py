"""Artifact service."""

import uuid

from app.core.unit_of_work import UnitOfWork
from app.exceptions import NotFoundException
from app.models.artifact import Artifact
from app.schemas.artifact import ArtifactResponse
from app.schemas.common import PaginatedMeta


class ArtifactService:
    """Artifact collection management."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def list_artifacts(
        self, *, page: int = 1, page_size: int = 20, city_id: uuid.UUID | None = None
    ) -> tuple[list[ArtifactResponse], PaginatedMeta]:
        offset = (page - 1) * page_size
        if city_id is not None:
            city = await self._uow.cities.get_by_id(city_id)
            if city is None:
                raise NotFoundException("City not found")
            artifacts = await self._uow.artifacts.get_by_city(
                city_id, offset=offset, limit=page_size
            )
            total = await self._uow.artifacts.count_by_city(city_id)
        else:
            artifacts = await self._uow.artifacts.get_all(offset=offset, limit=page_size)
            total = await self._uow.artifacts.count()

        return [self._to_response(a) for a in artifacts], PaginatedMeta(
            page=page,
            page_size=page_size,
            total=total,
            total_pages=max(1, (total + page_size - 1) // page_size),
        )

    async def get_artifact(self, artifact_id: uuid.UUID) -> ArtifactResponse:
        artifact = await self._uow.artifacts.get_by_id(artifact_id)
        if artifact is None:
            raise NotFoundException("Artifact not found")
        return self._to_response(artifact)

    @staticmethod
    def _to_response(artifact: Artifact) -> ArtifactResponse:
        return ArtifactResponse(
            id=artifact.id,
            city_id=artifact.city_id,
            name=artifact.name,
            description=artifact.description,
            era=artifact.era,
            rarity=artifact.rarity,
            image_url=artifact.image_url,
            historical_context=artifact.historical_context,
            created_at=artifact.created_at,
        )
