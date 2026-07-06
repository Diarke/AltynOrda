"""Regression tests for admin and analytics features."""

import uuid

import pytest

from app.ai.service import AIService
from app.auth.password import hash_password
from app.core.unit_of_work import UnitOfWork
from app.enums import Language, ProgressType, QuestStatus, UserRole
from app.exceptions import NotFoundException
from app.models.artifact import Artifact
from app.models.certificate import Certificate
from app.models.chat_history import ChatHistory
from app.models.city import City
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.user import User
from app.rag.pipeline import RAGPipeline
from app.schemas.admin import AdminQuestCreateRequest, AdminUserUpdateRequest
from app.services.admin import AdminService


def make_admin_service(db_session) -> AdminService:
    uow = UnitOfWork(db_session)
    rag_pipeline = RAGPipeline(uow, AIService())
    return AdminService(uow, rag_pipeline)


async def test_admin_statistics_aggregates_core_metrics(db_session):
    user = User(
        id=uuid.uuid4(),
        email="admin-stats@example.com",
        username="adminstats",
        hashed_password=hash_password("Password123!"),
        full_name="Admin Stats",
        role=UserRole.ADMIN,
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
    artifact = Artifact(
        id=uuid.uuid4(),
        city_id=city.id,
        name="Test Artifact",
        description="Test artifact",
        era="XIII",
        rarity="common",
    )
    quest = Quest(
        id=uuid.uuid4(),
        city_id=city.id,
        title="Test Quest",
        description="Quest description",
        difficulty="easy",
        points=120,
        status=QuestStatus.COMPLETED,
    )
    progress = Progress(
        id=uuid.uuid4(),
        user_id=user.id,
        entity_type=ProgressType.QUEST,
        entity_id=quest.id,
        status=QuestStatus.COMPLETED,
        score=120,
    )
    certificate = Certificate(
        id=uuid.uuid4(),
        user_id=user.id,
        title="Explorer",
        description="Test certificate",
        completion_percent=100,
        certificate_code="CERT-001",
        issued_at="2026-07-05",
    )
    chat_message = ChatHistory(
        id=uuid.uuid4(),
        user_id=user.id,
        role="user",
        content="Tell me about the city",
        city_id=city.id,
    )

    db_session.add_all([user, city, artifact, quest, progress, certificate, chat_message])
    await db_session.commit()

    service = make_admin_service(db_session)
    statistics = await service.get_statistics()

    assert statistics.total_users == 1
    assert statistics.completed_quests == 1
    assert statistics.certificates_issued == 1
    assert statistics.most_visited_city == city.name
    assert statistics.most_popular_artifact == artifact.name
    assert statistics.most_used_ai_prompt == chat_message.content


async def test_admin_create_quest_persists_all_reward_fields(db_session):
    """Regression test: create_quest used to omit required QuestResponse fields
    (xp_reward, coin_reward, cooldown_hours, estimated_time_minutes, category),
    which raised a Pydantic ValidationError after the row was already committed."""
    city = City(
        id=uuid.uuid4(),
        name="Otrar",
        slug="otrar",
        description="Test city",
        historical_period="XIII",
        latitude=1.0,
        longitude=2.0,
    )
    db_session.add(city)
    await db_session.commit()

    service = make_admin_service(db_session)
    created = await service.create_quest(
        AdminQuestCreateRequest(
            city_id=city.id,
            title="Find the lost caravan",
            description="A quest description",
            xp_reward=250,
            coin_reward=40,
            cooldown_hours=12,
            estimated_time_minutes=20,
            category="exploration",
        )
    )

    assert created.xp_reward == 250
    assert created.coin_reward == 40
    assert created.cooldown_hours == 12
    assert created.estimated_time_minutes == 20
    assert created.category == "exploration"

    fetched = await service.get_quest(created.id)
    assert fetched.title == "Find the lost caravan"


async def test_admin_get_user_raises_not_found_for_missing_user(db_session):
    service = make_admin_service(db_session)
    with pytest.raises(NotFoundException):
        await service.get_user(uuid.uuid4())


async def test_admin_update_user_overrides_xp_coins_level(db_session):
    user = User(
        id=uuid.uuid4(),
        email="override@example.com",
        username="overrideuser",
        hashed_password=hash_password("Password123!"),
        full_name="Override User",
        role=UserRole.USER,
        is_active=True,
    )
    db_session.add(user)
    await db_session.commit()

    service = make_admin_service(db_session)
    updated = await service.update_user(
        user.id, AdminUserUpdateRequest(xp=500, coins=200, level=5)
    )

    assert updated.xp == 500
    assert updated.coins == 200
    assert updated.level == 5


async def test_admin_gallery_image_and_homepage_content_require_language(db_session):
    from app.schemas.admin import AdminGalleryImageCreateRequest, AdminHomepageContentCreateRequest

    service = make_admin_service(db_session)

    image = await service.create_gallery_image(
        AdminGalleryImageCreateRequest(
            image_url="https://example.com/image.jpg",
            language=Language.KAZAKH,
        )
    )
    assert image.language == Language.KAZAKH
    assert image.group_key is not None

    content = await service.create_homepage_content(
        AdminHomepageContentCreateRequest(section="hero", language=Language.RUSSIAN)
    )
    assert content.language == Language.RUSSIAN
    assert content.group_key is not None
