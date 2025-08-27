from pydantic import UUID4, AwareDatetime, BaseModel

from quantgrid_1.models.focus import Column
from quantgrid_1.models.question_status import QuestionStatus


class HashColumn(Column):
    hash: str = ""


class Question(BaseModel):
    id: UUID4
    timestamp: AwareDatetime
    status: QuestionStatus

    question: str
    answer: str

    reviewed: bool

    original_sheets: dict[str, str]
    solution_sheets: dict[str, str]

    focus: list[HashColumn]
