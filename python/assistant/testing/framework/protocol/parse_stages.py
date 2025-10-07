from typing import Any

from aidial_sdk.chat_completion import Status

from testing.models import (
    ActionsStage,
    AnyStage,
    DataStage,
    FocusStage,
    GenericStage,
    HintStage,
    IndexStage,
    RouteStage,
    SheetsStage,
    StandaloneQuestionStage,
)

# Order matters. Python dictionaries are ordered.
STAGE_MAPPING: dict[str, type[AnyStage]] = {
    "Classification": RouteStage,
    "Hint": HintStage,
    "Data": DataStage,
    "Index": IndexStage,
    "Actions": ActionsStage,
    "Changed Sheets": SheetsStage,
    "Focus": FocusStage,
    "Standalone Question": StandaloneQuestionStage,
    "": GenericStage,
}


def parse_stages(response: dict[str, Any]) -> list[AnyStage]:
    if "custom_content" not in response:
        return []

    parsed_stages: list[AnyStage] = []
    for stage in response["custom_content"].get("stages", []):
        parsed_stage = _parse_stage(
            stage["name"],
            stage.get("content", ""),
            stage.get("attachments", []),
            stage["status"],
        )

        if parsed_stage is not None:
            parsed_stages.append(parsed_stage)

    return parsed_stages


def _parse_stage(
    name: str,
    content: str,
    attachments: list[dict[str, Any]],
    status: Status,
) -> AnyStage | None:
    for stage_name, stage_model in STAGE_MAPPING.items():
        if name.strip().startswith(stage_name):
            return stage_model(
                name=name,
                content=content,
                attachments=attachments,
                status=status,
            )

    return None
