from enum import StrEnum

from public import public


@public
class QuestionStatus(StrEnum):
    UNDECIDED = "UNDECIDED"
    ACCEPTED = "ACCEPTED"
    DISCARDED = "DISCARDED"
