from typing import Annotated

from aidial_sdk.chat_completion import Status
from pydantic import BaseModel, Field

from quantgrid.models import AnyAction
from testing.models.assistant_score import AssistantScore, Verdict
from testing.models.query_stages import AnyStage, RouteStage, SheetsStage

AnnotatedAction = Annotated[AnyAction, Field(discriminator="type")]
AnnotatedStage = Annotated[AnyStage, Field(discriminator="type")]


class QueryInfo(BaseModel):
    query: str

    text: str = ""
    time: float = 0

    sheets: dict[str, str] = {}

    actions: list[AnnotatedAction] = []
    stages: list[AnnotatedStage] = []

    compilation_errors: list[str] = []
    llm_score: AssistantScore = AssistantScore(explanation="", verdict=Verdict.PASSED)

    @property
    def query_type(self) -> str | None:
        for stage in reversed(self.stages):
            if isinstance(stage, RouteStage):
                return stage.content

        return None

    @property
    def error_count(self) -> int:
        return sum(stage.status == Status.FAILED for stage in self.stages)

    @property
    def changed_sheets(self) -> dict[str, str] | None:
        for stage in reversed(self.stages):
            if isinstance(stage, SheetsStage):
                return stage.attachments

        return None
