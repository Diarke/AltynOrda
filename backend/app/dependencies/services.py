"""Service dependency providers."""

from typing import Annotated

from fastapi import Depends
from redis.asyncio import Redis

from app.ai.service import AIService
from app.core.unit_of_work import UnitOfWork
from app.database.redis import get_redis_client
from app.dependencies.database import get_uow
from app.rag.pipeline import RAGPipeline
from app.services.admin import AdminService
from app.services.auth import AuthService
from app.services.certificate import CertificateService
from app.services.chat import ChatService
from app.services.city import CityService
from app.services.group import GroupService
from app.services.progress import ProgressService
from app.services.quiz import QuizService
from app.services.storage import StorageService
from app.services.user import UserService


async def get_redis_dep() -> Redis:
    return await get_redis_client()


def get_auth_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> AuthService:
    return AuthService(uow)


def get_user_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> UserService:
    return UserService(uow)


def get_city_service(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    redis: Annotated[Redis, Depends(get_redis_dep)],
) -> CityService:
    return CityService(uow, redis)


def get_progress_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> ProgressService:
    return ProgressService(uow)


def get_certificate_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> CertificateService:
    return CertificateService(uow)


def get_group_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> GroupService:
    return GroupService(uow)


def get_ai_service() -> AIService:
    return AIService()


def get_rag_pipeline(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    ai_service: Annotated[AIService, Depends(get_ai_service)],
) -> RAGPipeline:
    return RAGPipeline(uow, ai_service)


def get_chat_service(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    redis: Annotated[Redis, Depends(get_redis_dep)],
    rag_pipeline: Annotated[RAGPipeline, Depends(get_rag_pipeline)],
) -> ChatService:
    return ChatService(uow, redis, rag_pipeline)


def get_quiz_service(uow: Annotated[UnitOfWork, Depends(get_uow)]) -> QuizService:
    return QuizService(uow)


def get_admin_service(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    rag_pipeline: Annotated[RAGPipeline, Depends(get_rag_pipeline)],
) -> AdminService:
    return AdminService(uow, rag_pipeline)


def get_storage_service() -> StorageService:
    return StorageService()
