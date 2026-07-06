"""AI historian chat service."""

import json
import logging
import uuid

from redis.asyncio import Redis

from app.ai.schemas import AIChatMessage
from app.config import get_settings
from app.constants import MAX_CHAT_HISTORY_MESSAGES
from app.core.unit_of_work import UnitOfWork
from app.models.chat_history import ChatHistory
from app.models.user import User
from app.rag.pipeline import RAGPipeline
from app.schemas.chat import ChatRequest, ChatResponse

logger = logging.getLogger(__name__)


class ChatService:
    """Manages AI historian conversations with RAG and caching."""

    def __init__(self, uow: UnitOfWork, redis: Redis, rag_pipeline: RAGPipeline) -> None:
        self._uow = uow
        self._redis = redis
        self._rag = rag_pipeline
        self._settings = get_settings()

    def _cache_key(self, user_id: uuid.UUID, city_id: uuid.UUID | None) -> str:
        city_part = str(city_id) if city_id else "global"
        return f"orda:chat:{user_id}:{city_part}"

    async def chat(self, user: User, data: ChatRequest) -> ChatResponse:
        """Process a chat message through the RAG pipeline."""
        history = await self._get_chat_history(user.id, data.city_id)

        response = await self._rag.query(
            data.message,
            city_id=data.city_id,
            chat_history=history,
            language=user.language,
        )

        await self._save_messages(user, data, response)
        await self._cache_history(user.id, data.city_id, data.message, response.answer)

        logger.info(
            "Chat processed for user %s, verified=%s, sources=%d",
            user.id,
            response.verified,
            len(response.sources),
        )
        return response

    async def _get_chat_history(
        self, user_id: uuid.UUID, city_id: uuid.UUID | None
    ) -> list[AIChatMessage]:
        cache_key = self._cache_key(user_id, city_id)
        cached = await self._redis.get(cache_key)
        if cached:
            messages = json.loads(cached)
            return [AIChatMessage(**m) for m in messages[-MAX_CHAT_HISTORY_MESSAGES:]]

        db_messages = await self._uow.chat_history.get_by_user(
            user_id, city_id=city_id, limit=MAX_CHAT_HISTORY_MESSAGES
        )
        return [AIChatMessage(role=m.role, content=m.content) for m in db_messages]

    async def _save_messages(
        self, user: User, data: ChatRequest, response: ChatResponse
    ) -> None:
        user_msg = ChatHistory(
            user_id=user.id,
            role="user",
            content=data.message,
            city_id=data.city_id,
        )
        sources_json = (
            json.dumps([s.model_dump() for s in response.sources])
            if response.sources
            else None
        )
        assistant_msg = ChatHistory(
            user_id=user.id,
            role="assistant",
            content=response.answer,
            city_id=data.city_id,
            sources=sources_json,
        )
        await self._uow.chat_history.create(user_msg)
        await self._uow.chat_history.create(assistant_msg)

    async def _cache_history(
        self,
        user_id: uuid.UUID,
        city_id: uuid.UUID | None,
        user_message: str,
        assistant_message: str,
    ) -> None:
        cache_key = self._cache_key(user_id, city_id)
        existing = await self._redis.get(cache_key)
        messages: list[dict[str, str]] = json.loads(existing) if existing else []
        messages.extend([
            {"role": "user", "content": user_message},
            {"role": "assistant", "content": assistant_message},
        ])
        messages = messages[-MAX_CHAT_HISTORY_MESSAGES:]
        await self._redis.setex(
            cache_key,
            self._settings.redis_chat_ttl_seconds,
            json.dumps(messages),
        )
