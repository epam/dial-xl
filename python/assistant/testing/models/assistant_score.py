import pydantic

from testing.models.verdict import Verdict


class AssistantScore(pydantic.BaseModel):
    """Analyze and score assistant output"""

    explanation: str = pydantic.Field(
        description="Analysis of assistant output and explanation of assigned score."
    )
    verdict: Verdict = pydantic.Field(description="Verdict for assistant generation.")
