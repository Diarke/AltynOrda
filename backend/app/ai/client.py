"""Groq API client wrapper."""

import logging

from groq import AsyncGroq

from app.ai.exceptions import AIException
from app.ai.schemas import (
    AICompletionRequest,
    AICompletionResponse,
    EmbeddingRequest,
    EmbeddingResponse,
)
from app.config import get_settings
from app.models.embedding import EMBEDDING_DIMENSION

logger = logging.getLogger(__name__)


class GroqClient:
    """Low-level Groq API client – never called from routes directly."""

    def __init__(self) -> None:
        settings = get_settings()
        if not settings.groq_api_key:
            logger.warning("Groq API key not configured")
        self._client = AsyncGroq(api_key=settings.groq_api_key or "not-configured")
        self._model = settings.groq_model
        self._embedding_model = settings.groq_embedding_model
        self._max_tokens = settings.groq_max_tokens
        self._temperature = settings.groq_temperature

    async def complete(self, request: AICompletionRequest) -> AICompletionResponse:
        """Generate a chat completion via Groq."""
        messages: list[dict[str, str]] = []
        if request.system_prompt:
            messages.append({"role": "system", "content": request.system_prompt})
        for msg in request.messages:
            messages.append({"role": msg.role, "content": msg.content})

        try:
            response = await self._client.chat.completions.create(
                model=self._model,
                messages=messages,
                temperature=request.temperature or self._temperature,
                max_tokens=request.max_tokens or self._max_tokens,
            )
            content = response.choices[0].message.content or ""
            tokens = response.usage.total_tokens if response.usage else None
            logger.info(
                "Groq completion successful",
                extra={"model": self._model, "tokens": tokens},
            )
            return AICompletionResponse(content=content, model=self._model, tokens_used=tokens)
        except Exception as exc:
            logger.error("Groq API error: %s", exc)
            raise AIException(f"AI completion failed: {exc}") from exc

    async def embed(self, request: EmbeddingRequest) -> EmbeddingResponse:
        """Generate text embeddings via Groq."""
        try:
            response = await self._client.embeddings.create(
                model=self._embedding_model,
                input=request.text,
            )
            embedding = response.data[0].embedding
            return EmbeddingResponse(
                embedding=embedding,
                model=self._embedding_model,
                dimensions=len(embedding),
            )
        except Exception as exc:
            logger.warning("Groq embedding failed, using fallback: %s", exc)
            return self._fallback_embedding(request.text)

    def _fallback_embedding(self, text: str) -> EmbeddingResponse:
        """Deterministic hash-based fallback when Groq embeddings unavailable."""
        import hashlib
        import math

        digest = hashlib.sha512(text.encode()).digest()
        values: list[float] = []
        for i in range(EMBEDDING_DIMENSION):
            byte_val = digest[i % len(digest)]
            values.append((byte_val / 127.5) - 1.0)

        magnitude = math.sqrt(sum(v * v for v in values))
        if magnitude > 0:
            values = [v / magnitude for v in values]

        return EmbeddingResponse(
            embedding=values,
            model="fallback-hash",
            dimensions=EMBEDDING_DIMENSION,
        )
