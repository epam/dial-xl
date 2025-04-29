import pydantic


class ScoreRecord(pydantic.BaseModel):
    table: str
    field: str
    data: str
    score: float
    description: str | None = None
