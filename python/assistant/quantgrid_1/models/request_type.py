from enum import Enum


class RequestType(Enum):
    DOCUMENTATION = "Documentation"
    EXPLAIN = "Explain"
    ACTIONS = "Actions"
    GENERAL = "General"


def define_type(type: str) -> RequestType:
    type = type.lower()
    candidates: list[RequestType] = [
        RequestType.DOCUMENTATION,
        RequestType.EXPLAIN,
        RequestType.ACTIONS,
        RequestType.GENERAL,
    ]
    matches: list[bool] = [(candidate.name.lower() in type) for candidate in candidates]
    if sum(matches) != 1:
        return RequestType.ACTIONS

    return candidates[matches.index(True)]
