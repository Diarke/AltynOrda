"""Quiz schemas."""

import uuid

from pydantic import Field

from app.schemas.common import BaseSchema


class QuizAnswer(BaseSchema):
    question_index: int = Field(ge=0)
    selected_answer: str = Field(min_length=1, max_length=500)


class QuizSubmitRequest(BaseSchema):
    quest_id: uuid.UUID
    answers: list[QuizAnswer] = Field(min_length=1)


class QuizResultResponse(BaseSchema):
    quest_id: uuid.UUID
    score: int
    total_questions: int
    passed: bool
    correct_answers: int
