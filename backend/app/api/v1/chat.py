"""Chat API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import UserOrAdmin
from app.core.unit_of_work import UnitOfWork
from app.dependencies.database import get_uow
from app.dependencies.services import get_chat_service
from app.enums import Language
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import SuccessResponse
from app.schemas.suggested_prompt import SuggestedPromptResponse
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["AI Historian"])


@router.post(
    "",
    response_model=SuccessResponse[ChatResponse],
    summary="Chat with the AI historian (RAG-powered)",
)
async def chat(
    data: ChatRequest,
    current_user: UserOrAdmin,
    service: Annotated[ChatService, Depends(get_chat_service)],
) -> SuccessResponse[ChatResponse]:
    response = await service.chat(current_user, data)
    return SuccessResponse(data=response)


@router.get(
    "/suggested-prompts",
    response_model=SuccessResponse[list[SuggestedPromptResponse]],
    summary="List admin-curated AI historian starter questions",
)
async def list_suggested_prompts(
    uow: Annotated[UnitOfWork, Depends(get_uow)],
    language: Language = Language.KAZAKH,
) -> SuccessResponse[list[SuggestedPromptResponse]]:
    prompts = await uow.suggested_prompts.get_active(language)
    return SuccessResponse(
        data=[
            SuggestedPromptResponse(
                id=p.id,
                prompt_text=p.prompt_text,
                language=p.language,
                sort_order=p.sort_order,
                is_active=p.is_active,
                created_at=p.created_at,
            )
            for p in prompts
        ]
    )
