"""Chat API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import CurrentUser
from app.dependencies.services import get_chat_service
from app.schemas.chat import ChatRequest, ChatResponse
from app.schemas.common import SuccessResponse
from app.services.chat import ChatService

router = APIRouter(prefix="/chat", tags=["AI Historian"])


@router.post(
    "",
    response_model=SuccessResponse[ChatResponse],
    summary="Chat with the AI historian (RAG-powered)",
)
async def chat(
    data: ChatRequest,
    current_user: CurrentUser,
    service: Annotated[ChatService, Depends(get_chat_service)],
) -> SuccessResponse[ChatResponse]:
    response = await service.chat(current_user, data)
    return SuccessResponse(data=response)
