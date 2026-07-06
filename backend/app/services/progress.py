"""Progress tracking service."""

import uuid
from datetime import UTC, datetime, timedelta

from app.constants import PLAYER_TITLES
from app.core.unit_of_work import UnitOfWork
from app.enums import AchievementType, ProgressType, QuestStatus
from app.exceptions import ConflictException, NotFoundException, ValidationException
from app.models.achievement import Achievement
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.user import User
from app.schemas.progress import (
    AchievementResponse,
    CoinSpendResponse,
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

    async def get_progress_stats(self, user: User) -> ProgressStatsResponse:
        await self._uow.users.get_by_id(user.id)
        return ProgressStatsResponse(
            user_id=user.id,
            level=user.level,
            title=self._get_title(user.level, user.language.value),
            xp=user.xp,
            coins=user.coins,
            streak_days=user.streak_days,
            unlocks=self._get_unlocks(user.level),
        )

    async def list_achievements(self, user: User) -> list[AchievementResponse]:
        achievements = await self._uow.achievements.get_by_user(user.id)
        return [
            AchievementResponse(
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
        await self._uow.session.commit()

        return QuestCompletionResponse(
            success=True,
            message="Quest completed",
            xp_gained=reward_xp,
            coins_gained=reward_coins,
            level=user.level,
            unlocks=self._get_unlocks(user.level),
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

    async def _award_achievements(self, user: User) -> None:
        achievements = await self._uow.achievements.get_by_user(user.id)
        existing_types = {achievement.achievement_type for achievement in achievements}

        progress_count = await self._uow.progress.count_completed_by_user(user.id)
        achievement_rules = [
            (
                AchievementType.EXPLORER,
                progress_count >= 3,
                "Explorer",
                "Completed your first batch of quests",
                150,
                30,
            ),
            (
                AchievementType.HISTORIAN,
                user.xp >= 1000,
                "Historian",
                "Reached a major XP milestone",
                250,
                50,
            ),
            (
                AchievementType.MERCHANT,
                user.coins >= 500,
                "Merchant",
                "Accumulated a substantial coin balance",
                120,
                100,
            ),
            (
                AchievementType.ARCHAEOLOGIST,
                progress_count >= 10,
                "Archaeologist",
                "Completed ten quests",
                400,
                80,
            ),
            (
                AchievementType.MASTER_OF_THE_STEPPE,
                user.streak_days >= 7,
                "Master of the Steppe",
                "Maintained a seven-day streak",
                500,
                120,
            ),
            (
                AchievementType.AI_SCHOLAR,
                user.streak_days >= 3,
                "AI Scholar",
                "Used the platform consistently",
                300,
                60,
            ),
        ]

        for achievement_type, condition, title, description, reward_xp, reward_coins in achievement_rules:
            if condition and achievement_type not in existing_types:
                achievement = Achievement(
                    user_id=user.id,
                    achievement_type=achievement_type,
                    title=title,
                    description=description,
                    reward_xp=reward_xp,
                    reward_coins=reward_coins,
                    achieved_at=datetime.now(UTC),
                )
                user.xp += reward_xp
                user.coins += reward_coins
                await self._uow.achievements.create(achievement)
                existing_types.add(achievement_type)

        user.level = self._calculate_level(user.xp)

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
