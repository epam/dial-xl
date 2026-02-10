from dial_xl.client import Client
from dial_xl.sheet import Sheet
from public import public

from dial.xl.assistant.graph.actions._actions import (
    Actions,
    AddTable,
    EditTable,
    RemoveTable,
)
from dial.xl.assistant.graph.artifact import ProjectArtifact


@public
async def apply_actions(
    client: Client, project_artifact: ProjectArtifact, actions: Actions
) -> ProjectArtifact:
    project = await project_artifact.build_project(client)

    for action in actions.actions:
        sheet_name = action.sheet_name or next(iter(project.sheet_names))
        if sheet_name not in project.sheet_names:
            project.add_sheet(Sheet(sheet_name, parsing_errors=[]))
        sheet = project.get_sheet(sheet_name)

        match action:
            case AddTable():
                temp_sheet = await client.parse_sheet("", action.table_code)
                table = temp_sheet.remove_table(action.table_name)

                sheet.add_table(table)

            case RemoveTable():
                sheet.remove_table(action.table_name)

            case EditTable():
                sheet.remove_table(action.table_name)

                temp_sheet = await client.parse_sheet("", action.table_code)
                table = temp_sheet.remove_table(action.table_name)

                sheet.add_table(table)

            case _:
                message = f"Unsupported Action Type: {type(action)}"
                raise ValueError(message)

    return ProjectArtifact.build_artifact(project)
