import pydantic


class ScoreRecord(pydantic.BaseModel):
    table: str
    field: str = pydantic.Field(..., alias="column")
    data: str = pydantic.Field(..., alias="value")
    score: float
    description: str | None = None
