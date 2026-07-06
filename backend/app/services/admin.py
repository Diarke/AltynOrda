"""Admin service for dashboard operations and analytics."""

from __future__ import annotations

import json
import uuid
from datetime import UTC, datetime, timedelta

from sqlalchemy import func, select

from app.ai.prompts import HISTORIAN_SYSTEM_PROMPT
from app.constants import AI_SYSTEM_PROMPT_SETTING_KEY, AVATAR_FRAME_CATALOG
from app.core.unit_of_work import UnitOfWork
from app.enums import Language, ProgressType, QuestStatus, UserRole
from app.exceptions import NotFoundException
from app.models.achievement import Achievement
from app.models.artifact import Artifact
from app.models.certificate import Certificate
from app.models.chat_history import ChatHistory
from app.models.city import City
from app.models.gallery_image import GalleryImage
from app.models.gamification_setting import GamificationSetting
from app.models.historical_document import HistoricalDocument
from app.models.homepage_content import HomepageContent
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.suggested_prompt import SuggestedPrompt
from app.models.system_setting import SystemSetting
from app.models.user import User
from app.models.user_cosmetic import UserCosmetic
from app.rag.pipeline import RAGPipeline
from app.schemas.admin import (
    AdminAchievementCreateRequest,
    AdminAchievementUpdateRequest,
    AdminActivityItem,
    AdminAIUsageResponse,
    AdminArtifactCreateRequest,
    AdminArtifactUpdateRequest,
    AdminCertificateCreateRequest,
    AdminCertificatesAnalyticsResponse,
    AdminCertificateUpdateRequest,
    AdminCityCreateRequest,
    AdminCityUpdateRequest,
    AdminCoinEconomyResponse,
    AdminCoinHolder,
    AdminGalleryImageCreateRequest,
    AdminGalleryImageResponse,
    AdminGalleryImageUpdateRequest,
    AdminGamificationSettingCreateRequest,
    AdminGamificationSettingResponse,
    AdminGamificationSettingUpdateRequest,
    AdminHistoricalDocumentCreateRequest,
    AdminHistoricalDocumentResponse,
    AdminHistoricalDocumentUpdateRequest,
    AdminHomepageContentCreateRequest,
    AdminHomepageContentResponse,
    AdminHomepageContentUpdateRequest,
    AdminQuestCreateRequest,
    AdminQuestResponse,
    AdminQuestUpdateRequest,
    AdminQuizQuestion,
    AdminRecentActivityResponse,
    AdminStatisticsResponse,
    AdminSystemPromptResponse,
    AdminSystemSettingCreateRequest,
    AdminSystemSettingResponse,
    AdminSystemSettingUpdateRequest,
    AdminUserGrowthResponse,
    AdminUserResponse,
    AdminUserUpdateRequest,
    AdminXPStatsResponse,
    TimeSeriesPoint,
)
from app.schemas.artifact import ArtifactResponse
from app.schemas.auth import UserResponse
from app.schemas.certificate import CertificateResponse
from app.schemas.city import CityResponse
from app.schemas.progress import AchievementResponse
from app.schemas.suggested_prompt import (
    AdminSuggestedPromptCreateRequest,
    AdminSuggestedPromptUpdateRequest,
    SuggestedPromptResponse,
)


class AdminService:
    """Administrative operations and analytics."""

    def __init__(self, uow: UnitOfWork, rag_pipeline: RAGPipeline) -> None:
        self._uow = uow
        self._rag = rag_pipeline

    # ─── Dashboard statistics ────────────────────────────────────────────────

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
        stmt = select(func.coalesce(func.avg(User.coins), 0)).select_from(User)
        result = await self._uow.session.execute(stmt)
        return int(result.scalar_one() or 0)

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

    # ─── Analytics ───────────────────────────────────────────────────────────

    async def _daily_series(
        self, model, date_column, *, days: int, where=None
    ) -> list[TimeSeriesPoint]:
        since = datetime.now(UTC) - timedelta(days=days)
        bucket = func.date_trunc("day", date_column)
        stmt = (
            select(bucket.label("bucket"), func.count().label("value"))
            .select_from(model)
            .where(date_column >= since)
        )
        if where is not None:
            stmt = stmt.where(where)
        stmt = stmt.group_by(bucket).order_by(bucket)
        result = await self._uow.session.execute(stmt)
        return [
            TimeSeriesPoint(date=row.bucket.date().isoformat(), value=row.value)
            for row in result.all()
        ]

    async def get_user_growth(self, *, days: int = 30) -> AdminUserGrowthResponse:
        series = await self._daily_series(User, User.created_at, days=days)
        return AdminUserGrowthResponse(series=series)

    async def get_quest_completion_analytics(self, *, days: int = 30):
        from app.schemas.admin import AdminQuestCompletionResponse

        series = await self._daily_series(
            Progress, Progress.created_at, days=days, where=Progress.status == QuestStatus.COMPLETED
        )

        by_status_stmt = select(Progress.status, func.count()).group_by(Progress.status)
        by_status_result = await self._uow.session.execute(by_status_stmt)
        by_status = {status.value: count for status, count in by_status_result.all()}

        top_quests_stmt = (
            select(Quest.title, func.count(Progress.id).label("completions"))
            .join(
                Progress,
                (Progress.entity_id == Quest.id)
                & (Progress.entity_type == ProgressType.QUEST)
                & (Progress.status == QuestStatus.COMPLETED),
            )
            .group_by(Quest.id, Quest.title)
            .order_by(func.count(Progress.id).desc())
            .limit(10)
        )
        top_quests_result = await self._uow.session.execute(top_quests_stmt)
        top_quests = [
            {"title": title, "completions": completions}
            for title, completions in top_quests_result.all()
        ]

        return AdminQuestCompletionResponse(
            series=series, by_status=by_status, top_quests=top_quests
        )

    async def get_ai_usage_analytics(self, *, days: int = 30) -> AdminAIUsageResponse:
        series = await self._daily_series(
            ChatHistory, ChatHistory.created_at, days=days, where=ChatHistory.role == "user"
        )
        total_stmt = select(func.count()).select_from(ChatHistory).where(ChatHistory.role == "user")
        total_result = await self._uow.session.execute(total_stmt)
        return AdminAIUsageResponse(series=series, total_messages=int(total_result.scalar_one()))

    async def get_xp_stats(self) -> AdminXPStatsResponse:
        avg_stmt = select(func.coalesce(func.avg(User.xp), 0), func.coalesce(func.max(User.xp), 0))
        avg_result = await self._uow.session.execute(avg_stmt)
        average_xp, max_xp = avg_result.one()

        bucket_edges = [(0, 100), (100, 500), (500, 1000), (1000, None)]
        buckets: list[dict[str, str | int]] = []
        for low, high in bucket_edges:
            stmt = select(func.count()).select_from(User).where(User.xp >= low)
            if high is not None:
                stmt = stmt.where(User.xp < high)
            result = await self._uow.session.execute(stmt)
            label = f"{low}-{high}" if high is not None else f"{low}+"
            buckets.append({"range": label, "count": int(result.scalar_one())})

        return AdminXPStatsResponse(
            average_xp=float(average_xp), max_xp=int(max_xp), buckets=buckets
        )

    async def get_coin_economy(self, *, top_n: int = 10) -> AdminCoinEconomyResponse:
        totals_stmt = select(
            func.coalesce(func.sum(User.coins), 0), func.coalesce(func.avg(User.coins), 0)
        )
        totals_result = await self._uow.session.execute(totals_stmt)
        total_coins, average_coins = totals_result.one()

        cost_by_key = {frame.key: frame.cost_coins for frame in AVATAR_FRAME_CATALOG}
        cosmetics_stmt = select(UserCosmetic.item_key, func.count()).group_by(UserCosmetic.item_key)
        cosmetics_result = await self._uow.session.execute(cosmetics_stmt)
        total_spent = sum(
            cost_by_key.get(item_key, 0) * count for item_key, count in cosmetics_result.all()
        )

        holders_stmt = (
            select(User.id, User.username, User.coins).order_by(User.coins.desc()).limit(top_n)
        )
        holders_result = await self._uow.session.execute(holders_stmt)
        top_holders = [
            AdminCoinHolder(user_id=row.id, username=row.username, coins=row.coins)
            for row in holders_result.all()
        ]

        return AdminCoinEconomyResponse(
            total_coins_in_circulation=int(total_coins),
            average_coins=float(average_coins),
            total_coins_spent_on_cosmetics=int(total_spent),
            top_holders=top_holders,
        )

    async def get_certificates_analytics(
        self, *, days: int = 30
    ) -> AdminCertificatesAnalyticsResponse:
        series = await self._daily_series(Certificate, Certificate.created_at, days=days)
        total = await self._uow.certificates.count()
        return AdminCertificatesAnalyticsResponse(series=series, total_issued=total)

    async def get_recent_activity(self, *, limit: int = 20) -> AdminRecentActivityResponse:
        items: list[AdminActivityItem] = []

        progress_stmt = (
            select(Progress, User.username)
            .join(User, User.id == Progress.user_id)
            .order_by(Progress.created_at.desc())
            .limit(limit)
        )
        progress_result = await self._uow.session.execute(progress_stmt)
        for progress, username in progress_result.all():
            items.append(
                AdminActivityItem(
                    type="progress",
                    user_id=progress.user_id,
                    username=username,
                    description=f"{progress.entity_type.value} progress: {progress.status.value}",
                    created_at=progress.created_at,
                )
            )

        certificates_stmt = (
            select(Certificate, User.username)
            .join(User, User.id == Certificate.user_id)
            .order_by(Certificate.created_at.desc())
            .limit(limit)
        )
        certificates_result = await self._uow.session.execute(certificates_stmt)
        for certificate, username in certificates_result.all():
            items.append(
                AdminActivityItem(
                    type="certificate",
                    user_id=certificate.user_id,
                    username=username,
                    description=f"Certificate issued: {certificate.title}",
                    created_at=certificate.created_at,
                )
            )

        chat_stmt = (
            select(ChatHistory, User.username)
            .join(User, User.id == ChatHistory.user_id)
            .where(ChatHistory.role == "user")
            .order_by(ChatHistory.created_at.desc())
            .limit(limit)
        )
        chat_result = await self._uow.session.execute(chat_stmt)
        for chat, username in chat_result.all():
            items.append(
                AdminActivityItem(
                    type="chat",
                    user_id=chat.user_id,
                    username=username,
                    description="Asked the AI historian a question",
                    created_at=chat.created_at,
                )
            )

        items.sort(key=lambda item: item.created_at, reverse=True)
        return AdminRecentActivityResponse(items=items[:limit])

    # ─── Users ───────────────────────────────────────────────────────────────

    async def count_users(
        self,
        *,
        query: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
    ) -> int:
        return await self._uow.users.count_search(query=query, role=role, is_active=is_active)

    async def list_users(
        self,
        *,
        query: str | None = None,
        role: UserRole | None = None,
        is_active: bool | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[AdminUserResponse]:
        users = await self._uow.users.search(
            query=query, role=role, is_active=is_active, offset=offset, limit=limit
        )
        return [self._to_admin_user_response(user) for user in users]

    async def get_user(self, user_id: uuid.UUID) -> AdminUserResponse:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundException("User not found")
        return self._to_admin_user_response(user)

    async def update_user(
        self, user_id: uuid.UUID, data: AdminUserUpdateRequest
    ) -> AdminUserResponse:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundException("User not found")
        if data.role is not None:
            user.role = data.role
        if data.is_active is not None:
            user.is_active = data.is_active
        if data.xp is not None:
            user.xp = data.xp
        if data.coins is not None:
            user.coins = data.coins
        if data.level is not None:
            user.level = data.level
        updated = await self._uow.users.update(user)
        return self._to_admin_user_response(updated)

    async def delete_user(self, user_id: uuid.UUID) -> None:
        user = await self._uow.users.get_by_id(user_id)
        if user is None:
            raise NotFoundException("User not found")
        await self._uow.users.delete(user)

    # ─── Cities ──────────────────────────────────────────────────────────────

    async def list_cities(self, *, offset: int = 0, limit: int = 20) -> list[CityResponse]:
        cities = await self._uow.cities.get_all(offset=offset, limit=limit)
        return [self._to_city_response(city) for city in cities]

    async def count_cities(self) -> int:
        return await self._uow.cities.count()

    async def get_city(self, city_id: uuid.UUID) -> CityResponse:
        city = await self._uow.cities.get_by_id(city_id)
        if city is None:
            raise NotFoundException("City not found")
        return self._to_city_response(city)

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

    async def update_city(self, city_id: uuid.UUID, data: AdminCityUpdateRequest) -> CityResponse:
        city = await self._uow.cities.get_by_id(city_id)
        if city is None:
            raise NotFoundException("City not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(city, field, value)
        updated = await self._uow.cities.update(city)
        return self._to_city_response(updated)

    async def delete_city(self, city_id: uuid.UUID) -> None:
        city = await self._uow.cities.get_by_id(city_id)
        if city is None:
            raise NotFoundException("City not found")
        await self._uow.cities.delete(city)

    # ─── Artifacts ───────────────────────────────────────────────────────────

    async def list_artifacts(self, *, offset: int = 0, limit: int = 20) -> list[ArtifactResponse]:
        artifacts = await self._uow.artifacts.get_all(offset=offset, limit=limit)
        return [self._to_artifact_response(artifact) for artifact in artifacts]

    async def count_artifacts(self) -> int:
        return await self._uow.artifacts.count()

    async def get_artifact(self, artifact_id: uuid.UUID) -> ArtifactResponse:
        artifact = await self._uow.artifacts.get_by_id(artifact_id)
        if artifact is None:
            raise NotFoundException("Artifact not found")
        return self._to_artifact_response(artifact)

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

    async def update_artifact(
        self, artifact_id: uuid.UUID, data: AdminArtifactUpdateRequest
    ) -> ArtifactResponse:
        artifact = await self._uow.artifacts.get_by_id(artifact_id)
        if artifact is None:
            raise NotFoundException("Artifact not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(artifact, field, value)
        updated = await self._uow.artifacts.update(artifact)
        return self._to_artifact_response(updated)

    async def delete_artifact(self, artifact_id: uuid.UUID) -> None:
        artifact = await self._uow.artifacts.get_by_id(artifact_id)
        if artifact is None:
            raise NotFoundException("Artifact not found")
        await self._uow.artifacts.delete(artifact)

    # ─── Quests ──────────────────────────────────────────────────────────────

    async def list_quests(self, *, offset: int = 0, limit: int = 20) -> list[AdminQuestResponse]:
        quests = await self._uow.quests.get_all(offset=offset, limit=limit)
        return [self._to_quest_response(quest) for quest in quests]

    async def count_quests(self) -> int:
        return await self._uow.quests.count()

    async def get_quest(self, quest_id: uuid.UUID) -> AdminQuestResponse:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        return self._to_quest_response(quest)

    async def create_quest(self, data: AdminQuestCreateRequest) -> AdminQuestResponse:
        quest = Quest(
            city_id=data.city_id,
            title=data.title,
            description=data.description,
            difficulty=data.difficulty,
            points=data.points,
            xp_reward=data.xp_reward,
            coin_reward=data.coin_reward,
            cooldown_hours=data.cooldown_hours,
            estimated_time_minutes=data.estimated_time_minutes,
            category=data.category,
            status=QuestStatus(data.status),
            quiz_questions=self._quiz_questions_to_json(data.quiz_questions),
        )
        created = await self._uow.quests.create(quest)
        return self._to_quest_response(created)

    async def update_quest(
        self, quest_id: uuid.UUID, data: AdminQuestUpdateRequest
    ) -> AdminQuestResponse:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        payload = data.model_dump(exclude_unset=True)
        if "quiz_questions" in payload:
            payload["quiz_questions"] = self._quiz_questions_to_json(data.quiz_questions)
        if "status" in payload and payload["status"] is not None:
            payload["status"] = QuestStatus(payload["status"])
        for field, value in payload.items():
            setattr(quest, field, value)
        updated = await self._uow.quests.update(quest)
        return self._to_quest_response(updated)

    async def delete_quest(self, quest_id: uuid.UUID) -> None:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        await self._uow.quests.delete(quest)

    # ─── Gallery images ──────────────────────────────────────────────────────

    async def list_gallery_images(
        self,
        *,
        language: Language | None = None,
        group_key: uuid.UUID | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[AdminGalleryImageResponse]:
        images = await self._uow.gallery_images.search(
            language=language.value if language else None,
            group_key=group_key,
            offset=offset,
            limit=limit,
        )
        return [self._to_gallery_image_response(image) for image in images]

    async def count_gallery_images(
        self, *, language: Language | None = None, group_key: uuid.UUID | None = None
    ) -> int:
        return await self._uow.gallery_images.count_search(
            language=language.value if language else None, group_key=group_key
        )

    async def get_gallery_image(self, image_id: uuid.UUID) -> AdminGalleryImageResponse:
        image = await self._uow.gallery_images.get_by_id(image_id)
        if image is None:
            raise NotFoundException("Gallery image not found")
        return self._to_gallery_image_response(image)

    async def create_gallery_image(
        self, data: AdminGalleryImageCreateRequest
    ) -> AdminGalleryImageResponse:
        image = GalleryImage(
            title=data.title,
            description=data.description,
            language=data.language,
            group_key=data.group_key or uuid.uuid4(),
            image_url=data.image_url,
            alt_text=data.alt_text,
            sort_order=data.sort_order,
            is_active=data.is_active,
        )
        created = await self._uow.gallery_images.create(image)
        return self._to_gallery_image_response(created)

    async def update_gallery_image(
        self, image_id: uuid.UUID, data: AdminGalleryImageUpdateRequest
    ) -> AdminGalleryImageResponse:
        image = await self._uow.gallery_images.get_by_id(image_id)
        if image is None:
            raise NotFoundException("Gallery image not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(image, field, value)
        updated = await self._uow.gallery_images.update(image)
        return self._to_gallery_image_response(updated)

    async def delete_gallery_image(self, image_id: uuid.UUID) -> GalleryImage:
        image = await self._uow.gallery_images.get_by_id(image_id)
        if image is None:
            raise NotFoundException("Gallery image not found")
        await self._uow.gallery_images.delete(image)
        return image

    # ─── Homepage content ────────────────────────────────────────────────────

    async def list_homepage_content(
        self,
        *,
        section: str | None = None,
        language: Language | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> list[AdminHomepageContentResponse]:
        items = await self._uow.homepage_content.search(
            section=section,
            language=language.value if language else None,
            offset=offset,
            limit=limit,
        )
        return [self._to_homepage_content_response(item) for item in items]

    async def count_homepage_content(
        self, *, section: str | None = None, language: Language | None = None
    ) -> int:
        return await self._uow.homepage_content.count_search(
            section=section, language=language.value if language else None
        )

    async def get_homepage_content(self, content_id: uuid.UUID) -> AdminHomepageContentResponse:
        item = await self._uow.homepage_content.get_by_id(content_id)
        if item is None:
            raise NotFoundException("Homepage content not found")
        return self._to_homepage_content_response(item)

    async def create_homepage_content(
        self, data: AdminHomepageContentCreateRequest
    ) -> AdminHomepageContentResponse:
        content = HomepageContent(
            section=data.section,
            language=data.language,
            group_key=data.group_key or uuid.uuid4(),
            title=data.title,
            body=data.body,
            image_url=data.image_url,
            cta_text=data.cta_text,
            cta_url=data.cta_url,
            sort_order=data.sort_order,
            is_active=data.is_active,
        )
        created = await self._uow.homepage_content.create(content)
        return self._to_homepage_content_response(created)

    async def update_homepage_content(
        self, content_id: uuid.UUID, data: AdminHomepageContentUpdateRequest
    ) -> AdminHomepageContentResponse:
        item = await self._uow.homepage_content.get_by_id(content_id)
        if item is None:
            raise NotFoundException("Homepage content not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(item, field, value)
        updated = await self._uow.homepage_content.update(item)
        return self._to_homepage_content_response(updated)

    async def delete_homepage_content(self, content_id: uuid.UUID) -> None:
        item = await self._uow.homepage_content.get_by_id(content_id)
        if item is None:
            raise NotFoundException("Homepage content not found")
        await self._uow.homepage_content.delete(item)

    # ─── Gamification settings ───────────────────────────────────────────────

    async def list_gamification_settings(
        self, *, offset: int = 0, limit: int = 20
    ) -> list[AdminGamificationSettingResponse]:
        settings = await self._uow.gamification_settings.get_all(offset=offset, limit=limit)
        return [self._to_gamification_setting_response(setting) for setting in settings]

    async def count_gamification_settings(self) -> int:
        return await self._uow.gamification_settings.count()

    async def get_gamification_setting(
        self, setting_id: uuid.UUID
    ) -> AdminGamificationSettingResponse:
        setting = await self._uow.gamification_settings.get_by_id(setting_id)
        if setting is None:
            raise NotFoundException("Gamification setting not found")
        return self._to_gamification_setting_response(setting)

    async def create_gamification_setting(
        self, data: AdminGamificationSettingCreateRequest
    ) -> AdminGamificationSettingResponse:
        setting = GamificationSetting(key=data.key, value=data.value)
        created = await self._uow.gamification_settings.create(setting)
        return self._to_gamification_setting_response(created)

    async def update_gamification_setting(
        self, setting_id: uuid.UUID, data: AdminGamificationSettingUpdateRequest
    ) -> AdminGamificationSettingResponse:
        setting = await self._uow.gamification_settings.get_by_id(setting_id)
        if setting is None:
            raise NotFoundException("Gamification setting not found")
        setting.value = data.value
        updated = await self._uow.gamification_settings.update(setting)
        return self._to_gamification_setting_response(updated)

    async def delete_gamification_setting(self, setting_id: uuid.UUID) -> None:
        setting = await self._uow.gamification_settings.get_by_id(setting_id)
        if setting is None:
            raise NotFoundException("Gamification setting not found")
        await self._uow.gamification_settings.delete(setting)

    # ─── System settings ─────────────────────────────────────────────────────

    async def list_system_settings(
        self, *, offset: int = 0, limit: int = 20
    ) -> list[AdminSystemSettingResponse]:
        settings = await self._uow.system_settings.get_all(offset=offset, limit=limit)
        return [self._to_system_setting_response(setting) for setting in settings]

    async def count_system_settings(self) -> int:
        return await self._uow.system_settings.count()

    async def get_system_setting(self, setting_id: uuid.UUID) -> AdminSystemSettingResponse:
        setting = await self._uow.system_settings.get_by_id(setting_id)
        if setting is None:
            raise NotFoundException("System setting not found")
        return self._to_system_setting_response(setting)

    async def create_system_setting(
        self, data: AdminSystemSettingCreateRequest
    ) -> AdminSystemSettingResponse:
        setting = SystemSetting(key=data.key, value=data.value)
        created = await self._uow.system_settings.create(setting)
        return self._to_system_setting_response(created)

    async def update_system_setting(
        self, setting_id: uuid.UUID, data: AdminSystemSettingUpdateRequest
    ) -> AdminSystemSettingResponse:
        setting = await self._uow.system_settings.get_by_id(setting_id)
        if setting is None:
            raise NotFoundException("System setting not found")
        setting.value = data.value
        updated = await self._uow.system_settings.update(setting)
        return self._to_system_setting_response(updated)

    async def delete_system_setting(self, setting_id: uuid.UUID) -> None:
        setting = await self._uow.system_settings.get_by_id(setting_id)
        if setting is None:
            raise NotFoundException("System setting not found")
        await self._uow.system_settings.delete(setting)

    async def _get_setting_by_key(self, key: str) -> SystemSetting | None:
        stmt = select(SystemSetting).where(SystemSetting.key == key)
        result = await self._uow.session.execute(stmt)
        return result.scalar_one_or_none()

    async def get_system_prompt(self) -> AdminSystemPromptResponse:
        setting = await self._get_setting_by_key(AI_SYSTEM_PROMPT_SETTING_KEY)
        if setting is None:
            return AdminSystemPromptResponse(value=HISTORIAN_SYSTEM_PROMPT, updated_at=None)
        return AdminSystemPromptResponse(value=setting.value, updated_at=setting.updated_at)

    async def set_system_prompt(self, value: str) -> AdminSystemPromptResponse:
        setting = await self._get_setting_by_key(AI_SYSTEM_PROMPT_SETTING_KEY)
        if setting is None:
            setting = SystemSetting(key=AI_SYSTEM_PROMPT_SETTING_KEY, value=value)
            created = await self._uow.system_settings.create(setting)
            return AdminSystemPromptResponse(value=created.value, updated_at=created.updated_at)
        setting.value = value
        updated = await self._uow.system_settings.update(setting)
        return AdminSystemPromptResponse(value=updated.value, updated_at=updated.updated_at)

    # ─── Historical documents ────────────────────────────────────────────────

    async def list_historical_documents(
        self, *, offset: int = 0, limit: int = 20
    ) -> list[AdminHistoricalDocumentResponse]:
        documents = await self._uow.documents.get_all(offset=offset, limit=limit)
        return [await self._to_historical_document_response(document) for document in documents]

    async def count_historical_documents(self) -> int:
        return await self._uow.documents.count()

    async def get_historical_document(
        self, document_id: uuid.UUID
    ) -> AdminHistoricalDocumentResponse:
        document = await self._uow.documents.get_by_id(document_id)
        if document is None:
            raise NotFoundException("Historical document not found")
        return await self._to_historical_document_response(document)

    async def create_historical_document(
        self, data: AdminHistoricalDocumentCreateRequest
    ) -> AdminHistoricalDocumentResponse:
        document = HistoricalDocument(
            city_id=data.city_id,
            title=data.title,
            content=data.content,
            source=data.source,
            source_type=data.source_type,
            author=data.author,
            year=data.year,
            language=data.language,
            group_key=data.group_key or uuid.uuid4(),
        )
        created = await self._uow.documents.create(document)
        await self._uow.flush()
        await self._rag.index_document(created.id)
        return await self._to_historical_document_response(created)

    async def update_historical_document(
        self, document_id: uuid.UUID, data: AdminHistoricalDocumentUpdateRequest
    ) -> AdminHistoricalDocumentResponse:
        document = await self._uow.documents.get_by_id(document_id)
        if document is None:
            raise NotFoundException("Historical document not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(document, field, value)
        updated = await self._uow.documents.update(document)
        # Re-embed synchronously so edited content is reflected immediately.
        await self._rag.index_document(updated.id)
        return await self._to_historical_document_response(updated)

    async def delete_historical_document(self, document_id: uuid.UUID) -> None:
        document = await self._uow.documents.get_by_id(document_id)
        if document is None:
            raise NotFoundException("Historical document not found")
        await self._uow.documents.delete(document)

    # ─── Certificates ────────────────────────────────────────────────────────

    async def list_certificates(
        self, *, offset: int = 0, limit: int = 20
    ) -> list[CertificateResponse]:
        certificates = await self._uow.certificates.get_all(offset=offset, limit=limit)
        return [self._to_certificate_response(certificate) for certificate in certificates]

    async def count_certificates(self) -> int:
        return await self._uow.certificates.count()

    async def get_certificate(self, certificate_id: uuid.UUID) -> CertificateResponse:
        certificate = await self._uow.certificates.get_by_id(certificate_id)
        if certificate is None:
            raise NotFoundException("Certificate not found")
        return self._to_certificate_response(certificate)

    async def create_certificate(self, data: AdminCertificateCreateRequest) -> CertificateResponse:
        certificate = Certificate(
            user_id=data.user_id,
            title=data.title,
            description=data.description,
            completion_percent=data.completion_percent,
            certificate_code=data.certificate_code,
            issued_at=data.issued_at,
        )
        created = await self._uow.certificates.create(certificate)
        return self._to_certificate_response(created)

    async def update_certificate(
        self, certificate_id: uuid.UUID, data: AdminCertificateUpdateRequest
    ) -> CertificateResponse:
        certificate = await self._uow.certificates.get_by_id(certificate_id)
        if certificate is None:
            raise NotFoundException("Certificate not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(certificate, field, value)
        updated = await self._uow.certificates.update(certificate)
        return self._to_certificate_response(updated)

    async def delete_certificate(self, certificate_id: uuid.UUID) -> None:
        certificate = await self._uow.certificates.get_by_id(certificate_id)
        if certificate is None:
            raise NotFoundException("Certificate not found")
        await self._uow.certificates.delete(certificate)

    # ─── Achievements ────────────────────────────────────────────────────────

    async def list_achievements(
        self, *, offset: int = 0, limit: int = 20
    ) -> list[AchievementResponse]:
        achievements = await self._uow.achievements.get_all(offset=offset, limit=limit)
        return [self._to_achievement_response(achievement) for achievement in achievements]

    async def count_achievements(self) -> int:
        return await self._uow.achievements.count()

    async def get_achievement(self, achievement_id: uuid.UUID) -> AchievementResponse:
        achievement = await self._uow.achievements.get_by_id(achievement_id)
        if achievement is None:
            raise NotFoundException("Achievement not found")
        return self._to_achievement_response(achievement)

    async def create_achievement(self, data: AdminAchievementCreateRequest) -> AchievementResponse:
        achievement = Achievement(
            user_id=data.user_id,
            achievement_type=data.achievement_type,
            title=data.title,
            description=data.description,
            icon_url=data.icon_url,
            achieved_at=datetime.now(UTC),
        )
        created = await self._uow.achievements.create(achievement)
        return self._to_achievement_response(created)

    async def update_achievement(
        self, achievement_id: uuid.UUID, data: AdminAchievementUpdateRequest
    ) -> AchievementResponse:
        achievement = await self._uow.achievements.get_by_id(achievement_id)
        if achievement is None:
            raise NotFoundException("Achievement not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(achievement, field, value)
        updated = await self._uow.achievements.update(achievement)
        return self._to_achievement_response(updated)

    async def delete_achievement(self, achievement_id: uuid.UUID) -> None:
        achievement = await self._uow.achievements.get_by_id(achievement_id)
        if achievement is None:
            raise NotFoundException("Achievement not found")
        await self._uow.achievements.delete(achievement)

    # ─── Suggested prompts ───────────────────────────────────────────────────

    async def list_suggested_prompts(
        self, *, offset: int = 0, limit: int = 20
    ) -> list[SuggestedPromptResponse]:
        prompts = await self._uow.suggested_prompts.get_all(offset=offset, limit=limit)
        return [self._to_suggested_prompt_response(prompt) for prompt in prompts]

    async def count_suggested_prompts(self) -> int:
        return await self._uow.suggested_prompts.count()

    async def get_suggested_prompt(self, prompt_id: uuid.UUID) -> SuggestedPromptResponse:
        prompt = await self._uow.suggested_prompts.get_by_id(prompt_id)
        if prompt is None:
            raise NotFoundException("Suggested prompt not found")
        return self._to_suggested_prompt_response(prompt)

    async def create_suggested_prompt(
        self, data: AdminSuggestedPromptCreateRequest
    ) -> SuggestedPromptResponse:
        prompt = SuggestedPrompt(
            prompt_text=data.prompt_text,
            language=data.language,
            sort_order=data.sort_order,
            is_active=data.is_active,
        )
        created = await self._uow.suggested_prompts.create(prompt)
        return self._to_suggested_prompt_response(created)

    async def update_suggested_prompt(
        self, prompt_id: uuid.UUID, data: AdminSuggestedPromptUpdateRequest
    ) -> SuggestedPromptResponse:
        prompt = await self._uow.suggested_prompts.get_by_id(prompt_id)
        if prompt is None:
            raise NotFoundException("Suggested prompt not found")
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(prompt, field, value)
        updated = await self._uow.suggested_prompts.update(prompt)
        return self._to_suggested_prompt_response(updated)

    async def delete_suggested_prompt(self, prompt_id: uuid.UUID) -> None:
        prompt = await self._uow.suggested_prompts.get_by_id(prompt_id)
        if prompt is None:
            raise NotFoundException("Suggested prompt not found")
        await self._uow.suggested_prompts.delete(prompt)

    # ─── Response mapping helpers ────────────────────────────────────────────

    @staticmethod
    def _quiz_questions_to_json(questions: list[AdminQuizQuestion] | None) -> str | None:
        if questions is None:
            return None
        return json.dumps([question.model_dump() for question in questions])

    @staticmethod
    def _quiz_questions_from_json(raw: str | None) -> list[AdminQuizQuestion] | None:
        if not raw:
            return None
        try:
            parsed = json.loads(raw)
        except (ValueError, TypeError):
            return None
        if not isinstance(parsed, list):
            return None
        return [AdminQuizQuestion(**item) for item in parsed if isinstance(item, dict)]

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
            language=user.language,
            created_at=user.created_at,
        )

    @classmethod
    def _to_admin_user_response(cls, user: User) -> AdminUserResponse:
        base = cls._to_user_response(user)
        return AdminUserResponse(
            **base.model_dump(),
            xp=user.xp,
            coins=user.coins,
            level=user.level,
            streak_days=user.streak_days,
            equipped_frame=user.equipped_frame,
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

    @classmethod
    def _to_quest_response(cls, quest: Quest) -> AdminQuestResponse:
        return AdminQuestResponse(
            id=quest.id,
            city_id=quest.city_id,
            title=quest.title,
            description=quest.description,
            difficulty=quest.difficulty,
            points=quest.points,
            xp_reward=quest.xp_reward,
            coin_reward=quest.coin_reward,
            cooldown_hours=quest.cooldown_hours,
            estimated_time_minutes=quest.estimated_time_minutes,
            category=quest.category,
            status=quest.status,
            completion_status=quest.status,
            created_at=quest.created_at,
            quiz_questions=cls._quiz_questions_from_json(quest.quiz_questions),
        )

    @staticmethod
    def _to_gallery_image_response(image: GalleryImage) -> AdminGalleryImageResponse:
        return AdminGalleryImageResponse(
            id=image.id,
            title=image.title,
            description=image.description,
            language=image.language,
            group_key=image.group_key,
            image_url=image.image_url,
            alt_text=image.alt_text,
            sort_order=image.sort_order,
            is_active=image.is_active,
            created_at=image.created_at,
        )

    @staticmethod
    def _to_homepage_content_response(item: HomepageContent) -> AdminHomepageContentResponse:
        return AdminHomepageContentResponse(
            id=item.id,
            section=item.section,
            language=item.language,
            group_key=item.group_key,
            title=item.title,
            body=item.body,
            image_url=item.image_url,
            cta_text=item.cta_text,
            cta_url=item.cta_url,
            sort_order=item.sort_order,
            is_active=item.is_active,
            created_at=item.created_at,
        )

    @staticmethod
    def _to_gamification_setting_response(
        setting: GamificationSetting,
    ) -> AdminGamificationSettingResponse:
        return AdminGamificationSettingResponse(
            id=setting.id,
            key=setting.key,
            value=setting.value,
            created_at=setting.created_at,
            updated_at=setting.updated_at,
        )

    @staticmethod
    def _to_system_setting_response(setting: SystemSetting) -> AdminSystemSettingResponse:
        return AdminSystemSettingResponse(
            id=setting.id,
            key=setting.key,
            value=setting.value,
            created_at=setting.created_at,
            updated_at=setting.updated_at,
        )

    async def _to_historical_document_response(
        self, document: HistoricalDocument
    ) -> AdminHistoricalDocumentResponse:
        embedded_chunks = await self._uow.documents.count_embeddings(document.id)
        return AdminHistoricalDocumentResponse(
            id=document.id,
            city_id=document.city_id,
            title=document.title,
            content=document.content,
            source=document.source,
            source_type=document.source_type,
            author=document.author,
            year=document.year,
            language=document.language,
            group_key=document.group_key,
            embedded_chunks=embedded_chunks,
            created_at=document.created_at,
        )

    @staticmethod
    def _to_certificate_response(certificate: Certificate) -> CertificateResponse:
        return CertificateResponse(
            id=certificate.id,
            user_id=certificate.user_id,
            title=certificate.title,
            description=certificate.description,
            completion_percent=certificate.completion_percent,
            certificate_code=certificate.certificate_code,
            issued_at=certificate.issued_at,
            created_at=certificate.created_at,
        )

    @staticmethod
    def _to_achievement_response(achievement: Achievement) -> AchievementResponse:
        return AchievementResponse(
            id=achievement.id,
            user_id=achievement.user_id,
            achievement_type=achievement.achievement_type.value,
            title=achievement.title,
            description=achievement.description,
            icon_url=achievement.icon_url,
            reward_xp=achievement.reward_xp,
            reward_coins=achievement.reward_coins,
            achieved_at=achievement.achieved_at,
        )

    @staticmethod
    def _to_suggested_prompt_response(prompt: SuggestedPrompt) -> SuggestedPromptResponse:
        return SuggestedPromptResponse(
            id=prompt.id,
            prompt_text=prompt.prompt_text,
            language=prompt.language,
            sort_order=prompt.sort_order,
            is_active=prompt.is_active,
            created_at=prompt.created_at,
        )
