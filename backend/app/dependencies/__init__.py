"""Dependencies package."""

from app.dependencies.database import get_db, get_uow
from app.dependencies.services import (
    get_ai_service,
    get_auth_service,
    get_certificate_service,
    get_chat_service,
    get_city_service,
    get_progress_service,
    get_quiz_service,
    get_rag_pipeline,
    get_redis_dep,
    get_user_service,
)

__all__ = [
    "get_ai_service",
    "get_auth_service",
    "get_certificate_service",
    "get_chat_service",
    "get_city_service",
    "get_db",
    "get_progress_service",
    "get_quiz_service",
    "get_rag_pipeline",
    "get_redis_dep",
    "get_uow",
    "get_user_service",
]
