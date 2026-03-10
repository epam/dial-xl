from aidial_sdk.chat_completion import Role
from pydantic import UUID4, AwareDatetime, BaseModel

from dial.xl.assistant.dto.focus import ColumnDTO
from dial.xl.assistant.dto.question_status import QuestionStatus


class HashColumnDTO(ColumnDTO):
    hash: str = ""


class MessageDTO(BaseModel):
    content: str
    role: Role


class QuestionDTO(BaseModel):
    id: UUID4
    timestamp: AwareDatetime
    status: QuestionStatus

    history: list[MessageDTO]
    question: str
    answer: str

    reviewed: bool

    original_sheets: dict[str, str]
    solution_sheets: dict[str, str]

    focus: list[HashColumnDTO]
