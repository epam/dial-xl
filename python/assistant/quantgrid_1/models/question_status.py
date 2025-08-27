import enum


class QuestionStatus(enum.StrEnum):
    UNDECIDED = "UNDECIDED"
    ACCEPTED = "ACCEPTED"
    DISCARDED = "DISCARDED"
