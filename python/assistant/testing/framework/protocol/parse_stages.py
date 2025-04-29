from typing import Any

from aidial_sdk.chat_completion import Status

from testing.models import (
    ActionsStage,
    AnyStage,
    DataStage,
    GenericStage,
    HintStage,
    IndexStage,
    RouteStage,
    SheetsStage,
)

# Order matters. Python dictionaries are ordered.
STAGE_MAPPING: dict[str, type[AnyStage]] = {
    "Classification": RouteStage,
    "Hint": HintStage,
    "Data": DataStage,
    "Index": IndexStage,
    "Actions": ActionsStage,
    "Changed Sheets": SheetsStage,
    "": GenericStage,
}


def parse_stages(response: dict[str, Any]) -> list[AnyStage]:
    if "custom_content" not in response:
        return []

    parsed_stages: list[AnyStage] = []
    for stage in response["custom_content"].get("stages", []):
        attachments: dict[str, str] = {
            attachment["title"]: attachment["data"]
            for attachment in stage.get("attachments", [])
        }

        parsed_stage = _parse_stage(
            stage["name"], stage.get("content", ""), attachments, stage["status"]
        )

        if parsed_stage is not None:
            parsed_stages.append(parsed_stage)

    return parsed_stages


def _parse_stage(
    name: str,
    content: str,
    attachments: dict[str, str],
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
