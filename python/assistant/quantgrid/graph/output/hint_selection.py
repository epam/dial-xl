from enum import StrEnum

import pydantic


class HintRelevancyClass(StrEnum):
    EXACT_MATCH = "exact_match"
    SEMANTIC_MATCH = "semantic_match"


class HintSelectionResponse(pydantic.BaseModel):
    name: str | None = pydantic.Field(description=" Original name of the hint.")
    relevancy_class: HintRelevancyClass | None = pydantic.Field(
        description="Relevancy class of the hint."
    )
