import json

from typing import Any

from aidial_sdk.chat_completion import Request, Role
from dial_xl.client import Client
from dial_xl.project import Project
from dial_xl.sheet import Sheet

from quantgrid_2a.exceptions import QGLoadingException
from quantgrid_2a.utils import create_project_from_sheets


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


async def load_project(request: Request, client: Client) -> tuple[Project, Sheet]:
    try:
        state: dict[str, Any] | None = None
        for message in request.messages:
            if message.role == Role.SYSTEM:
                try:
                    state = json.loads(str(message.content) or "")
                except json.decoder.JSONDecodeError:
                    pass

        if state is not None:
            project = await create_project_from_sheets(
                client, state["currentProjectName"], state["sheets"]
            )
            sheet = await _load_main_sheet(client, project, state["currentSheet"])
            return project, sheet

        project_name = _extract_project_name(request)
        if project_name is None:
            raise QGLoadingException(
                "Completion request did not contain project name to load."
            )

        project = await client.parse_project(project_name)
        sheet = await _load_main_sheet(client, project, None)
        return project, sheet
    except Exception as exception:
        raise QGLoadingException("Failed to load current project state.") from exception
