"""AI service – single entry point for all AI operations."""

import logging

from app.ai.client import GroqClient
from app.ai.prompts import (
    HISTORIAN_SYSTEM_PROMPT,
    INSUFFICIENT_CONTEXT_RESPONSES,
    LANGUAGE_NAMES,
    NO_CONTEXT_RESPONSES,
)
from app.ai.schemas import AIChatMessage, AICompletionRequest, EmbeddingRequest
from app.enums import Language

logger = logging.getLogger(__name__)


class AIService:
    """High-level AI service isolating Groq/LangChain from business logic."""

    def __init__(self) -> None:
        self._client = GroqClient()

    async def generate_historian_response(
        self,
        user_message: str,
        context_chunks: list[str],
        *,
        chat_history: list[AIChatMessage] | None = None,
        language: Language = Language.ENGLISH,
    ) -> str:
        """Generate a historian response grounded in retrieved context."""
        if not context_chunks:
            logger.info("No context chunks available for RAG query")
            return NO_CONTEXT_RESPONSES[language.value]

        context = "\n\n---\n\n".join(context_chunks)
        language_name = LANGUAGE_NAMES[language.value]
        system_prompt = HISTORIAN_SYSTEM_PROMPT.format(context=context, language_name=language_name)

        messages: list[AIChatMessage] = list(chat_history or [])
        messages.append(AIChatMessage(role="user", content=user_message))

        request = AICompletionRequest(
            messages=messages,
            system_prompt=system_prompt,
        )
        response = await self._client.complete(request)
        return response.content

    async def generate_embedding(self, text: str) -> list[float]:
        """Generate embedding vector for text."""
        result = await self._client.embed(EmbeddingRequest(text=text))
        return result.embedding

    async def verify_context_sufficiency(self, context_chunks: list[str]) -> bool:
        """Check if retrieved context is sufficient for answering."""
        if not context_chunks:
            return False
        total_length = sum(len(c) for c in context_chunks)
        return total_length >= 100

    def get_insufficient_context_message(self, language: Language = Language.ENGLISH) -> str:
        return INSUFFICIENT_CONTEXT_RESPONSES[language.value]
