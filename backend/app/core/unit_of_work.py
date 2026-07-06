"""Unit of Work pattern for transaction management."""

from types import TracebackType

from sqlalchemy.ext.asyncio import AsyncSession

from app.repositories.achievement import AchievementRepository
from app.repositories.artifact import ArtifactRepository
from app.repositories.certificate import CertificateRepository
from app.repositories.chat_history import ChatHistoryRepository
from app.repositories.city import CityRepository
from app.repositories.embedding import EmbeddingRepository
from app.repositories.gamification_setting import GamificationSettingRepository
from app.repositories.gallery_image import GalleryImageRepository
from app.repositories.historical_document import HistoricalDocumentRepository
from app.repositories.homepage_content import HomepageContentRepository
from app.repositories.progress import ProgressRepository
from app.repositories.quest import QuestRepository
from app.repositories.system_setting import SystemSettingRepository
from app.repositories.user import UserRepository
from app.repositories.user_cosmetic import UserCosmeticRepository


class UnitOfWork:
    """Manages a single database transaction across repositories."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session
        self.users = UserRepository(session)
        self.cities = CityRepository(session)
        self.artifacts = ArtifactRepository(session)
        self.quests = QuestRepository(session)
        self.progress = ProgressRepository(session)
        self.achievements = AchievementRepository(session)
        self.chat_history = ChatHistoryRepository(session)
        self.certificates = CertificateRepository(session)
        self.documents = HistoricalDocumentRepository(session)
        self.embeddings = EmbeddingRepository(session)
        self.gallery_images = GalleryImageRepository(session)
        self.homepage_content = HomepageContentRepository(session)
        self.gamification_settings = GamificationSettingRepository(session)
        self.system_settings = SystemSettingRepository(session)
        self.user_cosmetics = UserCosmeticRepository(session)

    async def __aenter__(self) -> "UnitOfWork":
        return self

    async def __aexit__(
        self,
        exc_type: type[BaseException] | None,
        exc_val: BaseException | None,
        exc_tb: TracebackType | None,
    ) -> None:
        if exc_type is not None:
            await self.rollback()
        else:
            await self.commit()

    async def commit(self) -> None:
        await self.session.commit()

    async def rollback(self) -> None:
        await self.session.rollback()

    async def flush(self) -> None:
        await self.session.flush()
