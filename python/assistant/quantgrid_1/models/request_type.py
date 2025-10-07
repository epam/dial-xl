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
    final_class = type.split("Class: ")[-1]
    for candidate in candidates:
        if candidate.name.lower() in final_class.lower():
            return candidate

    return RequestType.ACTIONS
