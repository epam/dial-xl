import json

from typing import Any

from aidial_sdk.chat_completion import Request, Role
from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet
from pydantic import TypeAdapter
from typing_extensions import deprecated

from quantgrid.configuration import LOGGER
from quantgrid.exceptions import XLLoadingException
from quantgrid.models import ProjectHint, RawProjectHint
from quantgrid.utils.dial import DIALApi
from quantgrid.utils.project import ProjectUtil


def _extract_project_name(request: Request) -> str | None:
    if request.custom_fields is None:
        return None

    if request.custom_fields.configuration is None:
        return None

    if request.custom_fields.configuration.get("project", None) is None:
        return None

    return request.custom_fields.configuration["project"]


async def _load_any_sheet(client: Client, project: Project) -> Sheet:
    for sheet in project.sheets:
        return sheet

    sheet = await client.parse_sheet("Main", "\n")
    project.add_sheet(sheet)

    return sheet


async def _load_main_sheet(
    client: Client, project: Project, sheet: str | None
) -> Sheet:
    if sheet is None or sheet not in project.sheet_names:
        return await _load_any_sheet(client, project)

    return project.get_sheet(sheet)


def _parse_request_json(request: Request) -> dict[str, Any] | None:
    state: dict[str, Any] | None = None
    for message in request.messages:
        if message.role == Role.SYSTEM:
            try:
                state = json.loads(str(message.content) or "")
            except json.decoder.JSONDecodeError:
                pass

    return state


async def load_project(
    request: Request, client: Client, project_util: ProjectUtil
) -> tuple[Project, Sheet]:
    state = _parse_request_json(request)
    if state is not None:
        project = await project_util.create_project_from_code(
            state["currentProjectName"], state["sheets"]
        )
        sheet = await _load_main_sheet(client, project, state["currentSheet"])
        return project, sheet

    project_name = _extract_project_name(request)
    if project_name is None:
        raise XLLoadingException(
            "Completion request did not contain project name to load."
        )

    project = await client.parse_project(project_name)
    sheet = await _load_main_sheet(client, project, None)
    return project, sheet


@deprecated("Use load_hints_from instead")
async def load_hints(dial_api: DIALApi, request: Request) -> dict[str, ProjectHint]:
    try:
        state = _parse_request_json(request)
        if state is None:
            raise XLLoadingException(
                "Request did not contain project folder path for ai-hints."
            )

        return await load_hints_from(dial_api, state["inputFolder"])
    except Exception as e:
        LOGGER.info(f"Failed to load hints for project: {e}")

    return {}


async def load_hints_from(
    dial_api: DIALApi, input_folder: str | None
) -> dict[str, ProjectHint]:
    if input_folder is None:
        LOGGER.info("No hints input folder provided.")

    try:
        hints_bytes = await dial_api.get_file(f"{input_folder}/.hints.ai")
        LOGGER.info(f"Found hints for project {input_folder}")
    except Exception as e:
        LOGGER.info(f"Failed to load hints for project: {e}")
        hints_bytes = b"[]"  # No hints found

    type_adapter = TypeAdapter(list[RawProjectHint])

    raw_hints_parsed = type_adapter.validate_json(hints_bytes)
    LOGGER.info(f"Loaded {len(raw_hints_parsed)} hints.")

    hints_parsed = RawProjectHint.format_hints(raw_hints_parsed)
    hints_dict = {hint.name: hint for hint in hints_parsed}

    LOGGER.debug(f"Hints: {hints_dict}")

    return hints_dict
