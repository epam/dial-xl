from public import public
from pydantic import BaseModel, Field

from tests.e2e.models.verdict import Verdict


@public
class AssistantScore(BaseModel):
    """Analyze and score assistant output"""

    explanation: str = Field(
        description="Analysis of assistant output and explanation of assigned score."
    )

    verdict: Verdict = Field(description="Verdict for assistant generation.")
    score: float | None = Field(description="Assigned score.")
