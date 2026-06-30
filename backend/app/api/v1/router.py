"""API v1 router aggregation."""

from fastapi import APIRouter

from app.api.v1 import (
    artifacts,
    auth,
    certificates,
    chat,
    cities,
    progress,
    quests,
    quiz,
    users,
)

api_v1_router = APIRouter()
api_v1_router.include_router(auth.router)
api_v1_router.include_router(users.router)
api_v1_router.include_router(cities.router)
api_v1_router.include_router(artifacts.router)
api_v1_router.include_router(quests.router)
api_v1_router.include_router(progress.router)
api_v1_router.include_router(chat.router)
api_v1_router.include_router(certificates.router)
api_v1_router.include_router(quiz.router)
