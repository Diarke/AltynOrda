"""Regression tests for the gamification progression system."""

import uuid
from datetime import UTC, datetime, timedelta

from app.auth.password import hash_password
from app.core.unit_of_work import UnitOfWork
from app.enums import QuestStatus, UserRole
from app.models.city import City
from app.models.quest import Quest
from app.models.user import User
from app.services.progress import ProgressService
from app.services.quest import QuestService


async def test_complete_quest_awards_xp_coins_and_level(db_session):
    user = User(
        id=uuid.uuid4(),
        email="gamify@example.com",
        username="gamifyuser",
        hashed_password=hash_password("Password123!"),
        full_name="Gamify User",
        role=UserRole.USER,
        is_active=True,
    )
    city = City(
        id=uuid.uuid4(),
        name="Test City",
        slug="test-city",
        description="Test city",
        historical_period="XIII",
        latitude=1.0,
        longitude=2.0,
    )
    quest = Quest(
        id=uuid.uuid4(),
        city_id=city.id,
        title="Ancient Trail",
        description="Solve the trail",
        difficulty="easy",
        xp_reward=150,
        coin_reward=40,
        cooldown_hours=24,
        estimated_time_minutes=20,
        category="exploration",
        status=QuestStatus.NOT_STARTED,
    )

    db_session.add_all([user, city, quest])
    await db_session.commit()

    service = ProgressService(UnitOfWork(db_session))
    result = await service.complete_quest(user, quest.id)

    assert result.xp_gained == 150
    assert result.coins_gained == 40
    assert result.level == 1
    assert result.unlocks["level_unlocks"] == []


async def test_daily_login_updates_streak_and_rewards(db_session):
    user = User(
        id=uuid.uuid4(),
        email="daily@example.com",
        username="dailyuser",
        hashed_password=hash_password("Password123!"),
        full_name="Daily User",
        role=UserRole.USER,
        is_active=True,
        last_login_at=datetime.now(UTC) - timedelta(days=1),
        streak_days=1,
    )

    db_session.add(user)
    await db_session.commit()

    service = ProgressService(UnitOfWork(db_session))
    result = await service.claim_daily_login(user)

    assert result.streak_days == 2
    assert result.xp_gained >= 50
    assert result.coins_gained >= 10


async def test_quest_listing_reflects_completion_status_and_cooldown_per_user(db_session):
    user = User(
        id=uuid.uuid4(),
        email="cooldown@example.com",
        username="cooldownuser",
        hashed_password=hash_password("Password123!"),
        full_name="Cooldown User",
        role=UserRole.USER,
        is_active=True,
    )
    city = City(
        id=uuid.uuid4(),
        name="Cooldown City",
        slug="cooldown-city",
        description="Test city",
        historical_period="XIII",
        latitude=1.0,
        longitude=2.0,
    )
    quest = Quest(
        id=uuid.uuid4(),
        city_id=city.id,
        title="Guarded Trail",
        description="Solve the trail",
        difficulty="easy",
        xp_reward=100,
        coin_reward=20,
        cooldown_hours=24,
        estimated_time_minutes=15,
        category="exploration",
        status=QuestStatus.NOT_STARTED,
    )
    db_session.add_all([user, city, quest])
    await db_session.commit()

    uow = UnitOfWork(db_session)
    await ProgressService(uow).complete_quest(user, quest.id)

    quest_service = QuestService(uow)
    responses, _ = await quest_service.list_quests(current_user=user)
    completed = next(r for r in responses if r.id == quest.id)
    assert completed.completion_status == QuestStatus.COMPLETED
    assert completed.cooldown_until is not None

    anonymous_responses, _ = await quest_service.list_quests(current_user=None)
    anonymous = next(r for r in anonymous_responses if r.id == quest.id)
    assert anonymous.completion_status == QuestStatus.NOT_STARTED
    assert anonymous.cooldown_until is None
