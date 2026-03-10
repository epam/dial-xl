import re

from typing import Annotated

from aidial_sdk.chat_completion import Status
from pydantic import BaseModel, Field

from dial.xl.assistant.dto.focus import FocusDTO
from dial.xl.assistant.dto.question import QuestionDTO
from dial.xl.assistant.dto.stages import (
    CHANGED_SHEETS,
    CLASSIFICATION,
    FOCUS,
    STANDALONE_QUESTION,
)
from dial.xl.assistant.utils.string.text import unify_text
from tests.e2e.models.actions import AnyAction
from tests.e2e.models.assistant_score import AssistantScore
from tests.e2e.models.stage import Stage
from tests.e2e.models.verdict import Verdict

AnnotatedAction = Annotated[AnyAction, Field(discriminator="type")]


class QueryInfo(BaseModel):
    query: str

    text: str = ""
    time: float = 0

    sheets: dict[str, str] = {}

    actions: list[AnnotatedAction] = []
    stages: list[Stage] = []

    compilation_errors: list[str] = []

    llm_score: AssistantScore = AssistantScore(
        explanation="", verdict=Verdict.PASSED, score=None
    )

    redundancy_score: AssistantScore = AssistantScore(
        explanation="", verdict=Verdict.PASSED, score=None
    )

    @property
    def error_count(self) -> int:
        return sum(stage.status == Status.FAILED for stage in self.stages)

    @property
    def query_type(self) -> str | None:
        for stage in reversed(self.stages):
            if stage.name.startswith(CLASSIFICATION):
                return stage.content

        return None

    @property
    def changed_sheets(self) -> dict[str, str]:
        for stage in reversed(self.stages):
            if not stage.name.startswith(CHANGED_SHEETS):
                continue

            return {
                match.group(1): unify_text(attachment.data.strip("`\n"))
                for attachment in stage.attachments
                if (match := re.match(r"DSL \((.*)\)", attachment.title)) is not None
            }

        return {}

    @property
    def focus(self) -> FocusDTO:
        for stage in reversed(self.stages):
            if not stage.name.startswith(FOCUS):
                continue

            json_content = stage.content.strip("`json\n")
            return FocusDTO.model_validate_json(json_content)

        return FocusDTO(columns=[])

    @property
    def standalone_question(self) -> str | None:
        for stage in reversed(self.stages):
            if stage.name.startswith(STANDALONE_QUESTION):
                return stage.content

        return None

    @property
    def standalone_question_json(self) -> QuestionDTO | None:
        for stage in reversed(self.stages):
            if not stage.name.startswith(STANDALONE_QUESTION):
                continue

            for attachment in stage.attachments:
                return QuestionDTO.model_validate_json(attachment.data)

        return None
