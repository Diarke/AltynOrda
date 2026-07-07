"""Quiz submission service."""

import json

from app.core.unit_of_work import UnitOfWork
from app.enums import ProgressType, QuestStatus
from app.exceptions import NotFoundException, ValidationException
from app.models.progress import Progress
from app.models.user import User
from app.schemas.quiz import QuizResultResponse, QuizSubmitRequest

PASSING_SCORE_PERCENT = 70


class QuizService:
    """Evaluate quiz submissions for quests."""

    def __init__(self, uow: UnitOfWork) -> None:
        self._uow = uow

    async def submit_quiz(self, user: User, data: QuizSubmitRequest) -> QuizResultResponse:
        quest = await self._uow.quests.get_by_id(data.quest_id)
        if quest is None:
            raise NotFoundException("Quest not found")
        if not quest.quiz_questions:
            raise ValidationException("This quest has no quiz questions")

        questions = json.loads(quest.quiz_questions)
        if not isinstance(questions, list):
            raise ValidationException("Invalid quiz format")

        total = len(questions)
        if len(data.answers) != total:
            raise ValidationException(f"Expected {total} answers, got {len(data.answers)}")

        correct = 0
        for answer in data.answers:
            if answer.question_index >= total:
                raise ValidationException(f"Invalid question index: {answer.question_index}")
            question = questions[answer.question_index]
            correct_answer = (
                question.get(f"correct_answer_{data.language.value}")
                or question.get("correct_answer_kk", "")
            ).strip().lower()
            if answer.selected_answer.strip().lower() == correct_answer:
                correct += 1

        score = int(correct / total * 100) if total > 0 else 0
        passed = score >= PASSING_SCORE_PERCENT

        existing = await self._uow.progress.get_user_entity_progress(
            user.id, ProgressType.QUEST, data.quest_id
        )
        if existing is None:
            progress = Progress(
                user_id=user.id,
                entity_type=ProgressType.QUEST,
                entity_id=data.quest_id,
                status=QuestStatus.COMPLETED if passed else QuestStatus.FAILED,
                score=score,
            )
            await self._uow.progress.create(progress)
        else:
            existing.score = score
            existing.status = QuestStatus.COMPLETED if passed else QuestStatus.FAILED
            await self._uow.progress.update(existing)

        return QuizResultResponse(
            quest_id=data.quest_id,
            score=score,
            total_questions=total,
            passed=passed,
            correct_answers=correct,
        )
