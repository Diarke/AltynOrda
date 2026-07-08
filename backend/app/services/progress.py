"""Progress tracking service."""

import uuid
from datetime import UTC, datetime, timedelta

from app.constants import AVATAR_FRAME_CATALOG, PLAYER_TITLES
from app.core.unit_of_work import UnitOfWork
from app.enums import AchievementMetric, Language, NotificationType, ProgressType, QuestStatus
from app.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.achievement import Achievement
from app.models.city import City
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.user import User
from app.models.user_cosmetic import UserCosmetic
from app.schemas.city import CitySummaryResponse
from app.schemas.progress import (
    AchievementResponse,
    CoinSpendResponse,
    CosmeticActionResponse,
    CosmeticCatalogResponse,
    CosmeticItemResponse,
    DailyLoginResponse,
    LeaderboardEntry,
    LeaderboardResponse,
    ProgressCreateRequest,
    ProgressResponse,
    ProgressStatsResponse,
    ProgressUpdateRequest,
    QuestCompletionResponse,
    UserProgressSummary,
)
from app.services.notification import notify
from app.utils.i18n import resolve_localized


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
        if created.status == QuestStatus.COMPLETED:
            await self._notify_entity_completed(user, created.entity_type, created.entity_id)
        return self._to_response(created)

    async def update_progress(
        self, user: User, progress_id: uuid.UUID, data: ProgressUpdateRequest
    ) -> ProgressResponse:
        progress = await self._uow.progress.get_by_id(progress_id)
        if progress is None or progress.user_id != user.id:
            raise NotFoundException("Progress record not found")

        was_completed = progress.status == QuestStatus.COMPLETED
        if data.status is not None:
            progress.status = data.status
        if data.score is not None:
            progress.score = data.score
        if data.notes is not None:
            progress.notes = data.notes

        updated = await self._uow.progress.update(progress)
        if updated.status == QuestStatus.COMPLETED and not was_completed:
            await self._notify_entity_completed(user, updated.entity_type, updated.entity_id)
        return self._to_response(updated)

    async def _notify_entity_completed(
        self, user: User, entity_type: ProgressType, entity_id: uuid.UUID
    ) -> None:
        """Notify the user when marking non-quest progress (currently: artifacts) complete.

        Quest completions are notified from complete_quest instead, and city
        visits are covered by the cities_visited achievement metric.
        """
        if entity_type != ProgressType.ARTIFACT:
            return
        artifact = await self._uow.artifacts.get_by_id(entity_id)
        if artifact is None:
            return
        await notify(
            self._uow,
            user.id,
            NotificationType.ARTIFACT_DISCOVERED,
            user.language,
            entity_type="artifact",
            entity_id=artifact.id,
            name=resolve_localized(artifact, "name", user.language),
        )

    async def get_progress_stats(
        self, user: User, language: Language | None = None
    ) -> ProgressStatsResponse:
        await self._uow.users.get_by_id(user.id)
        return ProgressStatsResponse(
            user_id=user.id,
            level=user.level,
            title=self._get_title(user.level, (language or user.language).value),
            xp=user.xp,
            coins=user.coins,
            streak_days=user.streak_days,
            unlocks=self._get_unlocks(user.level),
        )

    async def list_achievements(
        self, user: User, language: Language | None = None
    ) -> list[AchievementResponse]:
        achievements = await self._uow.achievements.get_by_user(user.id)
        resolved_language = language or user.language
        return [
            AchievementResponse(
                id=achievement.id,
                user_id=achievement.user_id,
                achievement_type=achievement.achievement_type,
                title=(
                    resolve_localized(achievement.definition, "title", resolved_language)
                    if achievement.definition is not None
                    else achievement.title
                ),
                description=(
                    resolve_localized(achievement.definition, "description", resolved_language)
                    if achievement.definition is not None
                    else achievement.description
                ),
                icon_url=achievement.icon_url,
                reward_xp=achievement.reward_xp,
                reward_coins=achievement.reward_coins,
                achieved_at=achievement.achieved_at,
            )
            for achievement in achievements
        ]

    async def complete_quest(self, user: User, quest_id: uuid.UUID) -> QuestCompletionResponse:
        quest = await self._uow.quests.get_by_id(quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")

        now = datetime.now(UTC)
        existing_progress = await self._uow.progress.get_user_entity_progress(
            user.id, ProgressType.QUEST, quest.id
        )
        if existing_progress is not None and existing_progress.cooldown_until is not None:
            if existing_progress.cooldown_until > now:
                raise ConflictException("Quest is on cooldown")

        reward_xp = quest.xp_reward if quest.xp_reward else quest.points
        reward_coins = quest.coin_reward
        user.xp += reward_xp
        user.coins += reward_coins
        user.level = self._calculate_level(user.xp)

        if existing_progress is None:
            progress = Progress(
                user_id=user.id,
                entity_type=ProgressType.QUEST,
                entity_id=quest.id,
                status=QuestStatus.COMPLETED,
                score=quest.points,
                completed_at=now,
                cooldown_until=now + timedelta(hours=quest.cooldown_hours),
            )
            await self._uow.progress.create(progress)
        else:
            existing_progress.status = QuestStatus.COMPLETED
            existing_progress.score = quest.points
            existing_progress.completed_at = now
            existing_progress.cooldown_until = now + timedelta(hours=quest.cooldown_hours)
            await self._uow.progress.update(existing_progress)

        await self._uow.users.update(user)
        await self._award_achievements(user)
        unlocked_city = await self.unlock_next_city(user)
        await self._uow.session.commit()

        return QuestCompletionResponse(
            success=True,
            message="Quest completed",
            xp_gained=reward_xp,
            coins_gained=reward_coins,
            level=user.level,
            unlocks=self._get_unlocks(user.level),
            unlocked_city=unlocked_city,
        )

    async def unlock_next_city(
        self, user: User, language: Language | None = None
    ) -> CitySummaryResponse | None:
        """Linear city progression: if the user's current (most recently opened,
        not-yet-completed) city now has every one of its quests completed, mark
        that city's progress COMPLETED and open the next city in sequence.

        Called automatically at the end of `complete_quest`, and also exposed
        standalone via `POST /cities/unlock-next` so the frontend can re-check
        without needing to complete another quest first. Returns the newly
        unlocked city, or None if there was nothing to unlock yet.
        """
        resolved_language = language or user.language
        city_records = await self._uow.progress.get_by_user_and_entity_type(user.id, ProgressType.CITY)
        open_records = [r for r in city_records if r.status != QuestStatus.COMPLETED]
        if not open_records:
            return None

        # Should be exactly one open city at a time in a linear journey, but if
        # more than one somehow exists, resolve to the earliest in sequence.
        current_city: City | None = None
        current_record: Progress | None = None
        for record in open_records:
            city = await self._uow.cities.get_by_id(record.entity_id)
            if city is not None and (current_city is None or city.sort_order < current_city.sort_order):
                current_city, current_record = city, record
        if current_city is None or current_record is None:
            return None

        city_quests = await self._uow.quests.get_by_city(current_city.id, limit=10_000)
        if not city_quests:
            return None
        completed_quest_ids = {
            p.entity_id
            for p in await self._uow.progress.get_by_user_and_entity_type(user.id, ProgressType.QUEST)
            if p.status == QuestStatus.COMPLETED
        }
        if not all(q.id in completed_quest_ids for q in city_quests):
            return None

        current_record.status = QuestStatus.COMPLETED
        current_record.completed_at = datetime.now(UTC)
        await self._uow.progress.update(current_record)

        next_city = await self._uow.cities.get_next(current_city.sort_order)
        if next_city is None:
            return None
        if await self._uow.progress.get_user_entity_progress(user.id, ProgressType.CITY, next_city.id) is not None:
            return None

        await self._uow.progress.create(
            Progress(user_id=user.id, entity_type=ProgressType.CITY, entity_id=next_city.id, status=QuestStatus.IN_PROGRESS)
        )
        await notify(
            self._uow,
            user.id,
            NotificationType.CITY_UNLOCKED,
            resolved_language,
            entity_type="city",
            entity_id=next_city.id,
            title=resolve_localized(next_city, "name", resolved_language),
        )
        return CitySummaryResponse(
            id=next_city.id,
            name=resolve_localized(next_city, "name", resolved_language),
            slug=next_city.slug,
            historical_period=resolve_localized(next_city, "historical_period", resolved_language),
            latitude=next_city.latitude,
            longitude=next_city.longitude,
            image_url=next_city.image_url,
            sort_order=next_city.sort_order,
            is_unlocked=True,
        )

    async def claim_daily_login(self, user: User) -> DailyLoginResponse:
        now = datetime.now(UTC)
        today = now.date()
        last_login = user.last_login_at

        if last_login is None:
            streak_days = 1
        else:
            last_login_date = last_login.astimezone(UTC).date()
            if last_login_date == today:
                streak_days = user.streak_days
            elif last_login_date == today - timedelta(days=1):
                streak_days = user.streak_days + 1
            else:
                streak_days = 1

        bonus_xp = 50 + min(20 * max(streak_days - 1, 0), 100)
        bonus_coins = 10 + min(5 * max(streak_days - 1, 0), 25)

        user.xp += bonus_xp
        user.coins += bonus_coins
        user.level = self._calculate_level(user.xp)
        user.streak_days = streak_days
        user.last_login_at = now

        await self._uow.users.update(user)
        await notify(
            self._uow,
            user.id,
            NotificationType.DAILY_REWARD,
            user.language,
            bonus_xp=bonus_xp,
            bonus_coins=bonus_coins,
            streak_days=streak_days,
        )
        await notify(
            self._uow,
            user.id,
            NotificationType.DAILY_QUEST_REFRESHED,
            user.language,
        )
        await self._award_achievements(user)
        await self._uow.session.commit()

        return DailyLoginResponse(
            success=True,
            message="Daily login reward collected",
            streak_days=user.streak_days,
            xp_gained=bonus_xp,
            coins_gained=bonus_coins,
            level=user.level,
            unlocks=self._get_unlocks(user.level),
        )

    async def spend_coins(self, user: User, amount: int, reason: str) -> CoinSpendResponse:
        if amount <= 0:
            raise ValidationException("Amount must be positive")
        if user.coins < amount:
            raise ValidationException("Not enough coins")

        user.coins -= amount
        await self._uow.users.update(user)
        await self._uow.session.commit()
        return CoinSpendResponse(
            success=True,
            message=reason,
            coins_spent=amount,
            remaining_coins=user.coins,
        )

    async def get_leaderboard(self, limit: int = 10) -> LeaderboardResponse:
        users = await self._uow.users.get_leaderboard(limit=limit)
        entries = [
            LeaderboardEntry(
                user_id=user.id,
                username=user.username,
                level=user.level,
                xp=user.xp,
                coins=user.coins,
                achievement_count=len(user.achievements),
                streak_days=user.streak_days,
            )
            for user in users
        ]
        return LeaderboardResponse(
            xp=sorted(entries, key=lambda item: item.xp, reverse=True)[:limit],
            coins=sorted(entries, key=lambda item: item.coins, reverse=True)[:limit],
            achievements=sorted(
                entries, key=lambda item: item.achievement_count, reverse=True
            )[:limit],
            streaks=sorted(entries, key=lambda item: item.streak_days, reverse=True)[:limit],
        )

    async def list_cosmetics(self, user: User) -> CosmeticCatalogResponse:
        owned = await self._uow.user_cosmetics.get_by_user(user.id)
        owned_keys = {item.item_key for item in owned} | {"default"}
        language = user.language.value
        items = [
            CosmeticItemResponse(
                key=frame.key,
                name=frame.names.get(language, frame.names["en"]),
                cost_coins=frame.cost_coins,
                unlocked=frame.key in owned_keys,
                equipped=frame.key == user.equipped_frame,
            )
            for frame in AVATAR_FRAME_CATALOG
        ]
        return CosmeticCatalogResponse(items=items)

    async def unlock_cosmetic(self, user: User, item_key: str) -> CosmeticActionResponse:
        frame = next((f for f in AVATAR_FRAME_CATALOG if f.key == item_key), None)
        if frame is None:
            raise NotFoundException("Cosmetic item not found")

        existing = await self._uow.user_cosmetics.get_by_user_and_key(user.id, item_key)
        if existing is not None:
            raise ConflictException("Cosmetic item already unlocked")
        if user.coins < frame.cost_coins:
            raise ValidationException("Not enough coins")

        user.coins -= frame.cost_coins
        await self._uow.users.update(user)
        await self._uow.user_cosmetics.create(
            UserCosmetic(user_id=user.id, item_key=item_key, unlocked_at=datetime.now(UTC))
        )
        await self._uow.session.commit()

        return CosmeticActionResponse(
            success=True,
            message=f"{frame.names.get(user.language.value, frame.names['en'])} unlocked",
            equipped_frame=user.equipped_frame,
            remaining_coins=user.coins,
        )

    async def equip_cosmetic(self, user: User, item_key: str) -> CosmeticActionResponse:
        frame = next((f for f in AVATAR_FRAME_CATALOG if f.key == item_key), None)
        if frame is None:
            raise NotFoundException("Cosmetic item not found")

        if item_key != "default":
            owned = await self._uow.user_cosmetics.get_by_user_and_key(user.id, item_key)
            if owned is None:
                raise ValidationException("Cosmetic item is not unlocked yet")

        user.equipped_frame = item_key
        await self._uow.users.update(user)
        await self._uow.session.commit()

        return CosmeticActionResponse(
            success=True,
            message=f"{frame.names.get(user.language.value, frame.names['en'])} equipped",
            equipped_frame=user.equipped_frame,
            remaining_coins=user.coins,
        )

    async def _award_achievements(self, user: User) -> None:
        """Grant any admin-defined achievement whose metric threshold is now met.

        The catalog (AchievementDefinition) is entirely DB-driven and admin-editable —
        this method has no hardcoded achievement rules, only a fixed set of metrics
        it knows how to compute (see AchievementMetric / _compute_achievement_metrics).
        """
        definitions = await self._uow.achievement_definitions.get_active()
        if not definitions:
            return

        achievements = await self._uow.achievements.get_by_user(user.id)
        existing_definition_ids = {
            a.definition_id for a in achievements if a.definition_id is not None
        }
        existing_keys_without_definition = {
            a.achievement_type for a in achievements if a.definition_id is None
        }

        metrics = await self._compute_achievement_metrics(user)

        for definition in definitions:
            if definition.id in existing_definition_ids:
                continue
            if definition.key in existing_keys_without_definition:
                continue
            if metrics.get(definition.metric, 0) < definition.threshold:
                continue

            # Snapshotted in the recipient's language at award time — same convention
            # as before, just language-aware instead of always-English.
            localized_title = resolve_localized(definition, "title", user.language)
            achievement = Achievement(
                user_id=user.id,
                achievement_type=definition.key,
                definition_id=definition.id,
                title=localized_title,
                description=resolve_localized(definition, "description", user.language),
                icon_url=definition.icon_url,
                reward_xp=definition.reward_xp,
                reward_coins=definition.reward_coins,
                achieved_at=datetime.now(UTC),
            )
            user.xp += definition.reward_xp
            user.coins += definition.reward_coins
            await self._uow.achievements.create(achievement)
            await notify(
                self._uow,
                user.id,
                NotificationType.ACHIEVEMENT_UNLOCKED,
                user.language,
                entity_type="achievement_definition",
                entity_id=definition.id,
                title=localized_title,
                reward_xp=definition.reward_xp,
                reward_coins=definition.reward_coins,
            )
            existing_definition_ids.add(definition.id)

        user.level = self._calculate_level(user.xp)

    async def _compute_achievement_metrics(self, user: User) -> dict[str, int]:
        quests_completed = await self._uow.progress.count_completed_by_user_and_type(
            user.id, ProgressType.QUEST
        )
        cities_visited = await self._uow.progress.count_completed_by_user_and_type(
            user.id, ProgressType.CITY
        )
        artifacts_collected = await self._uow.progress.count_completed_by_user_and_type(
            user.id, ProgressType.ARTIFACT
        )
        certificates_issued = len(await self._uow.certificates.get_by_user(user.id))
        return {
            AchievementMetric.XP: user.xp,
            AchievementMetric.COINS: user.coins,
            AchievementMetric.LEVEL: user.level,
            AchievementMetric.STREAK_DAYS: user.streak_days,
            AchievementMetric.QUESTS_COMPLETED: quests_completed,
            AchievementMetric.CITIES_VISITED: cities_visited,
            AchievementMetric.ARTIFACTS_COLLECTED: artifacts_collected,
            AchievementMetric.CERTIFICATES_ISSUED: certificates_issued,
        }

    @staticmethod
    def _calculate_level(xp: int) -> int:
        if xp < 100:
            return 1
        return 1 + (xp - 100) // 250 + (1 if xp >= 500 else 0)

    @staticmethod
    def _get_title(level: int, language: str) -> str:
        titles = PLAYER_TITLES.get(language, PLAYER_TITLES["en"])
        index = min(level, len(titles)) - 1
        return titles[index]

    @staticmethod
    def _get_unlocks(level: int) -> dict[str, list[str]]:
        unlocks: dict[str, list[str]] = {"level_unlocks": []}
        if level >= 2:
            unlocks["level_unlocks"].append("New city story")
        if level >= 5:
            unlocks["level_unlocks"].append("Exclusive artifact")
        if level >= 8:
            unlocks["level_unlocks"].append("Advanced AI dialogue")
        if level >= 10:
            unlocks["level_unlocks"].append("Golden Certificate")
        if level >= 3:
            unlocks.setdefault("coin_unlocks", []).append("Profile themes")
        if level >= 4:
            unlocks.setdefault("coin_unlocks", []).append("Historical backgrounds")
        if level >= 6:
            unlocks.setdefault("coin_unlocks", []).append("Avatar frames")
        if level >= 7:
            unlocks.setdefault("coin_unlocks", []).append("AI conversation styles")
        if level >= 9:
            unlocks.setdefault("coin_unlocks", []).append("Exclusive city illustrations")
        if level >= 10:
            unlocks.setdefault("coin_unlocks", []).append("Special certificates")
        return unlocks

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
            completed_at=progress.completed_at,
            cooldown_until=progress.cooldown_until,
            notes=progress.notes,
            created_at=progress.created_at,
            updated_at=progress.updated_at,
        )
