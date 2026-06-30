"""Unit tests for AI service with mocked Groq client."""

from unittest.mock import AsyncMock, patch

import pytest

from app.ai.schemas import AICompletionResponse, EmbeddingResponse
from app.ai.service import AIService


@pytest.fixture
def ai_service() -> AIService:
    return AIService()


class TestAIService:
    @pytest.mark.asyncio
    async def test_no_context_returns_polite_message(self, ai_service: AIService) -> None:
        result = await ai_service.generate_historian_response("Who was Batu Khan?", [])
        assert "could not find verified" in result.lower()

    @pytest.mark.asyncio
    async def test_verify_context_sufficiency(self, ai_service: AIService) -> None:
        assert await ai_service.verify_context_sufficiency([]) is False
        assert await ai_service.verify_context_sufficiency(["short"]) is False
        long_context = ["x" * 150]
        assert await ai_service.verify_context_sufficiency(long_context) is True

    @pytest.mark.asyncio
    async def test_generate_with_context(self, ai_service: AIService) -> None:
        mock_response = AICompletionResponse(
            content="Batu Khan was the founder of the Golden Horde.",
            model="test-model",
        )
        with patch.object(ai_service._client, "complete", new_callable=AsyncMock) as mock_complete:
            mock_complete.return_value = mock_response
            result = await ai_service.generate_historian_response(
                "Who was Batu Khan?",
                ["Batu Khan founded the Golden Horde in the 13th century."],
            )
            assert "Batu Khan" in result
            mock_complete.assert_called_once()

    @pytest.mark.asyncio
    async def test_generate_embedding(self, ai_service: AIService) -> None:
        mock_embed = EmbeddingResponse(embedding=[0.1] * 768, model="test", dimensions=768)
        with patch.object(ai_service._client, "embed", new_callable=AsyncMock) as mock_embed_fn:
            mock_embed_fn.return_value = mock_embed
            result = await ai_service.generate_embedding("test text")
            assert len(result) == 768
