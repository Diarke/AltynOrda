"""Admin service for dashboard operations and analytics."""

from __future__ import annotations

import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.core.unit_of_work import UnitOfWork
from app.enums import ProgressType, QuestStatus, UserRole
from app.models.achievement import Achievement
from app.models.artifact import Artifact
from app.models.certificate import Certificate
from app.models.chat_history import ChatHistory
from app.models.city import City
from app.models.gamification_setting import GamificationSetting
from app.models.gallery_image import GalleryImage
from app.models.historical_document import HistoricalDocument
from app.models.homepage_content import HomepageContent
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.schemas.admin import (
    AdminAchievementCreateRequest,
    AdminArtifactCreateRequest,
    AdminCertificateCreateRequest,
    AdminCityCreateRequest,
    AdminGamificationSettingCreateRequest,
    AdminGalleryImageCreateRequest,
    AdminHistoricalDocumentCreateRequest,
    AdminHomepageContentCreateRequest,
    AdminQuestCreateRequest,
    AdminStatisticsResponse,
    AdminSystemSettingCreateRequest,
    AdminUserUpdateRequest,
)
from app.schemas.artifact import ArtifactResponse
from app.schemas.auth import UserResponse
from app.schemas.city import CityResponse
from app.schemas.quest import QuestResponse


class AdminService:
    """Administrative operations and analytics."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def get_statistics(self) -> AdminStatisticsResponse:
        total_users = await self._uow.users.count()
        new_users = await self._get_new_users_count()
        daily_active_users = await self._get_daily_active_users_count()
        completed_quests = await self._get_completed_quests_count()
        average_xp = await self._get_average_xp()
        average_coins = await self._get_average_coins()
        most_visited_city = await self._get_most_visited_city()
        most_popular_artifact = await self._get_most_popular_artifact()
        most_used_ai_prompt = await self._get_most_used_ai_prompt()
        certificates_issued = await self._uow.certificates.count()

        return AdminStatisticsResponse(
            total_users=total_users,
            new_users=new_users,
            daily_active_users=daily_active_users,
            completed_quests=completed_quests,
            average_xp=average_xp,
            average_coins=average_coins,
            most_visited_city=most_visited_city,
            most_popular_artifact=most_popular_artifact,
            most_used_ai_prompt=most_used_ai_prompt,
            certificates_issued=certificates_issued,
        )

    async def count_users(self) -> int:
        return await self._uow.users.count()

    async def list_users(self, *, offset: int = 0, limit: int = 20) -> list[UserResponse]:
        users = await self._uow.users.get_all(offset=offset, limit=limit)
        return [self._to_user_response(user) for user in users]

    async def get_user(self, user_id: uuid.UUID) -> UserResponse:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        return self._to_user_response(user)

    async def update_user(self, user_id: uuid.UUID, data: AdminUserUpdateRequest) -> UserResponse:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
        updated = await self._uow.users.update(user)
        return self._to_user_response(updated)

    async def delete_user(self, user_id: uuid.UUID) -> None:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise ValueError("User not found")
        await self._uow.users.delete(user)

    async def create_city(self, data: AdminCityCreateRequest) -> CityResponse:
        city = City(
            name=data.name,
            slug=data.slug,
            description=data.description,
            historical_period=data.historical_period,
            latitude=data.latitude,
            longitude=data.longitude,
            image_url=data.image_url,
            population_estimate=data.population_estimate,
            significance=data.significance,
        )
        created = await self._uow.cities.create(city)
        return self._to_city_response(created)

    async def create_artifact(self, data: AdminArtifactCreateRequest) -> ArtifactResponse:
        artifact = Artifact(
            city_id=data.city_id,
            name=data.name,
            description=data.description,
            era=data.era,
            rarity=data.rarity,
            image_url=data.image_url,
            historical_context=data.historical_context,
        )
        created = await self._uow.artifacts.create(artifact)
        return self._to_artifact_response(created)

    async def create_quest(self, data: AdminQuestCreateRequest) -> QuestResponse:
        quest = Quest(
            city_id=data.city_id,
            title=data.title,
            description=data.description,
            difficulty=data.difficulty,
            points=data.points,
            status=QuestStatus(data.status),
            quiz_questions=data.quiz_questions,
        )
        created = await self._uow.quests.create(quest)
        return self._to_quest_response(created)

    async def create_gallery_image(self, data: AdminGalleryImageCreateRequest) -> GalleryImage:
        image = GalleryImage(
            title=data.title,
            description=data.description,
            image_url=data.image_url,
            alt_text=data.alt_text,
            sort_order=data.sort_order,
            is_active=data.is_active,
        )
        return await self._uow.gallery_images.create(image)

    async def create_historical_document(
        self, data: AdminHistoricalDocumentCreateRequest
    ) -> HistoricalDocument:
        document = HistoricalDocument(
            city_id=data.city_id,
            title=data.title,
            content=data.content,
            source=data.source,
            source_type=data.source_type,
            author=data.author,
            year=data.year,
        )
        return await self._uow.documents.create(document)

    async def create_certificate(self, data: AdminCertificateCreateRequest) -> Certificate:
        certificate = Certificate(
            user_id=data.user_id,
            title=data.title,
            description=data.description,
            completion_percent=data.completion_percent,
            certificate_code=data.certificate_code,
            issued_at=data.issued_at,
        )
        return await self._uow.certificates.create(certificate)

    async def create_achievement(self, data: AdminAchievementCreateRequest) -> Achievement:
        achievement = Achievement(
            user_id=data.user_id,
            achievement_type=data.achievement_type,
            title=data.title,
            description=data.description,
            icon_url=data.icon_url,
        )
        return await self._uow.achievements.create(achievement)

    async def create_homepage_content(
        self, data: AdminHomepageContentCreateRequest
    ) -> HomepageContent:
        content = HomepageContent(
            section=data.section,
            title=data.title,
            body=data.body,
            image_url=data.image_url,
            cta_text=data.cta_text,
            cta_url=data.cta_url,
            sort_order=data.sort_order,
            is_active=data.is_active,
        )
        return await self._uow.homepage_content.create(content)

    async def create_gamification_setting(
        self, data: AdminGamificationSettingCreateRequest
    ) -> GamificationSetting:
        setting = GamificationSetting(key=data.key, value=data.value)
        return await self._uow.gamification_settings.create(setting)

    async def create_system_setting(self, data: AdminSystemSettingCreateRequest) -> SystemSetting:
        setting = SystemSetting(key=data.key, value=data.value)
        return await self._uow.system_settings.create(setting)

    async def _get_new_users_count(self) -> int:
        since = datetime.now(UTC) - timedelta(days=30)
        stmt = select(func.count()).select_from(User).where(User.created_at >= since)
        result = await self._uow.session.execute(stmt)
        return int(result.scalar_one())

    async def _get_daily_active_users_count(self) -> int:
        since = datetime.now(UTC) - timedelta(days=1)
        stmt = select(func.count(func.distinct(Progress.user_id))).select_from(Progress).where(
            Progress.created_at >= since
        )
        result = await self._uow.session.execute(stmt)
        return int(result.scalar_one())

    async def _get_completed_quests_count(self) -> int:
        stmt = select(func.count()).select_from(Progress).where(
            Progress.status == QuestStatus.COMPLETED
        )
        result = await self._uow.session.execute(stmt)
        return int(result.scalar_one())

    async def _get_average_xp(self) -> int:
        stmt = select(func.coalesce(func.avg(Progress.score), 0)).select_from(Progress)
        result = await self._uow.session.execute(stmt)
        return int(result.scalar_one() or 0)

    async def _get_average_coins(self) -> int:
        return 0

    async def _get_most_visited_city(self) -> str | None:
        stmt = (
            select(City.name)
            .join(
                Progress,
                (Progress.entity_id == City.id) & (Progress.entity_type == ProgressType.CITY),
            )
            .group_by(City.id, City.name)
            .order_by(func.count(Progress.id).desc())
            .limit(1)
        )
        result = await self._uow.session.execute(stmt)
        city_name = result.scalar_one_or_none()
        if city_name is None:
            fallback = await self._uow.cities.get_all(offset=0, limit=1)
            return fallback[0].name if fallback else None
        return city_name

    async def _get_most_popular_artifact(self) -> str | None:
        stmt = (
            select(Artifact.name)
            .join(
                Progress,
                (Progress.entity_id == Artifact.id) & (Progress.entity_type == ProgressType.ARTIFACT),
            )
            .group_by(Artifact.id, Artifact.name)
            .order_by(func.count(Progress.id).desc())
            .limit(1)
        )
        result = await self._uow.session.execute(stmt)
        artifact_name = result.scalar_one_or_none()
        if artifact_name is None:
            fallback = await self._uow.artifacts.get_all(offset=0, limit=1)
            return fallback[0].name if fallback else None
        return artifact_name

    async def _get_most_used_ai_prompt(self) -> str | None:
        stmt = (
            select(ChatHistory.content)
            .where(ChatHistory.role == "user")
            .group_by(ChatHistory.content)
            .order_by(func.count(ChatHistory.id).desc())
            .limit(1)
        )
        result = await self._uow.session.execute(stmt)
        return result.scalar_one_or_none()

    @staticmethod
    def _to_user_response(user: User) -> UserResponse:
        return UserResponse(
            id=user.id,
            email=user.email,
            username=user.username,
            full_name=user.full_name,
            role=user.role,
            is_active=user.is_active,
            bio=user.bio,
            avatar_url=user.avatar_url,
        )

    @staticmethod
    def _to_city_response(city: City) -> CityResponse:
        return CityResponse(
            id=city.id,
            name=city.name,
            slug=city.slug,
            description=city.description,
            historical_period=city.historical_period,
            latitude=city.latitude,
            longitude=city.longitude,
            image_url=city.image_url,
            population_estimate=city.population_estimate,
            significance=city.significance,
            created_at=city.created_at,
        )

    @staticmethod
    def _to_artifact_response(artifact: Artifact) -> ArtifactResponse:
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

    @staticmethod
    def _to_quest_response(quest: Quest) -> QuestResponse:
        return QuestResponse(
            id=quest.id,
            city_id=quest.city_id,
            title=quest.title,
            description=quest.description,
            difficulty=quest.difficulty,
            points=quest.points,
            status=quest.status,
            created_at=quest.created_at,
        )
