"""Quiz API routes."""

from typing import Annotated

from fastapi import APIRouter, Depends

from app.auth.dependencies import CurrentUser
from app.dependencies.services import get_quiz_service
from app.schemas.common import SuccessResponse
from app.schemas.quiz import QuizResultResponse, QuizSubmitRequest
from app.services.quiz import QuizService

router = APIRouter(prefix="/quiz", tags=["Quiz"])


@router.post(
    "",
    response_model=SuccessResponse[QuizResultResponse],
    summary="Submit quiz answers for a quest",
)
async def submit_quiz(
    data: QuizSubmitRequest,
    current_user: CurrentUser,
    service: Annotated[QuizService, Depends(get_quiz_service)],
) -> SuccessResponse[QuizResultResponse]:
    result = await service.submit_quiz(current_user, data)
    return SuccessResponse(data=result)
