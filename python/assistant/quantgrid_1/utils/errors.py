from typing import List

from aidial_sdk.chat_completion import Stage

from quantgrid_1.models.action import Action
from quantgrid_1.models.project import Project


async def filter_errors(project: Project, actions: List[Action]) -> List[str]:
    await project.compile()
    filtered_errors = []

    changed_tables = set()
    for action in actions:
        changed_tables.add(action.table_name)

    # TODO: Error line arithmetics
    for sheet in project.sheets:
        for error in sheet.parsing_errors:
            filtered_errors.append(error.message)

        for table in sheet.tables:
            if table.name not in changed_tables:
                continue

            for field in table.fields:
                if isinstance(field.field_type, str):
                    filtered_errors.append(field.field_type)

    return filtered_errors


async def smart_filter_errors(
    original_project: Project, project: Project, actions: List[Action]
) -> List[str]:
    original_errors = await filter_errors(original_project, actions)
    current_errors = await filter_errors(project, actions)

    return list(filter(lambda error: error not in original_errors, current_errors))


def output_errors(stage: Stage, errors: list[str]) -> None:
    if not len(errors):
        return

    stage.append_content("Detected errors:\n")
    for error in errors:
        stage.append_content(f"- {error}\n")
