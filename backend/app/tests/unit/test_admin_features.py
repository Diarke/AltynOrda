"""Regression tests for admin and analytics features."""

import uuid

from app.core.unit_of_work import UnitOfWork
from app.enums import ProgressType, QuestStatus, UserRole
from app.models.artifact import Artifact
from app.models.city import City
from app.models.chat_history import ChatHistory
from app.models.certificate import Certificate
from app.models.progress import Progress
from app.models.quest import Quest
from app.models.user import User
from app.services.admin import AdminService
from app.auth.password import hash_password


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

    service = AdminService(UnitOfWork(db_session))
    statistics = await service.get_statistics()

    assert statistics.total_users == 1
    assert statistics.completed_quests == 1
    assert statistics.certificates_issued == 1
    assert statistics.most_visited_city == city.name
    assert statistics.most_popular_artifact == artifact.name
    assert statistics.most_used_ai_prompt == chat_message.content
