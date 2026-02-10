from asyncio import Task, TaskGroup
from typing import TYPE_CHECKING

from dial_xl.client import Client
from dial_xl.project import Project
from public import public

if TYPE_CHECKING:
    from dial_xl.sheet import Sheet


@public
async def create_project(client: Client, name: str, sheets: dict[str, str]) -> Project:
    """Create a Project from name and raw sheets code.

    Parameters
    ----------
    client : Client
        DIAL XL Client for API calls.
    name : str
        Project path.
    sheets : dict[str, str]
        Per-Sheet DSL code.

    Returns
    -------
    Project

    """

    project = client.create_project(name)

    tasks: list[Task[Sheet]] = []
    async with TaskGroup() as group:
        for sheet_name, sheet_code in sheets.items():
            task = group.create_task(
                client.parse_sheet(sheet_name, sheet_code),
                name=f"Parse sheet {sheet_name}",
            )

            tasks.append(task)

    for task in tasks:
        project.add_sheet(task.result())

    return project
