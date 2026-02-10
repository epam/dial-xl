from public import public
from pydantic import BaseModel, Field


@public
class EmbeddingsRequestDTO(BaseModel):
    # TODO: Do we need "files/" prefix?

    project: str
    sheets: dict[str, str]

    search_in_all: bool
    n: int

    query: str


@public
class EmbeddingsResponseDTO(BaseModel):
    result: "EmbeddingsScoresDTO" = Field(alias="similaritySearchResponse")


@public
class EmbeddingsScoresDTO(BaseModel):
    scores: list["EmbeddingsScoreDTO"] = []


@public
class EmbeddingsScoreDTO(BaseModel):
    table: str
    column: str

    value: str
    score: float

    description: str | None = None
