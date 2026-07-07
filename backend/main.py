"""ORDA – AI Historical Journey API entry point."""

from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_v1_router
from app.config import get_settings
from app.database.redis import close_redis
from app.database.session import dispose_engine
from app.exceptions.handlers import register_exception_handlers
from app.middleware.logging import RequestLoggingMiddleware
from app.utils.logging import setup_logging


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    """Application startup and shutdown lifecycle."""
    setup_logging()
    yield
    await close_redis()
    await dispose_engine()


def create_app() -> FastAPI:
    """Application factory."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description=(
            "ORDA – AI Historical Journey API. Explore Golden Horde cities, "
            "complete quests, chat with an AI historian, and earn certificates."
        ),
        version="0.1.0",
        docs_url="/docs",
        redoc_url="/redoc",
        lifespan=lifespan,
    )

    origins = [
        "https://altyn-orda.vercel.app",
        "http://localhost:5173",
        "http://localhost:3000",
    ]
    app.add_middleware(
    CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(RequestLoggingMiddleware)

    register_exception_handlers(app)

    app.include_router(api_v1_router, prefix=settings.api_v1_prefix)

    @app.get("/health", tags=["Health"])
    async def health_check() -> dict[str, str]:
        return {"status": "healthy", "service": settings.app_name}

    return app


app = create_app()
