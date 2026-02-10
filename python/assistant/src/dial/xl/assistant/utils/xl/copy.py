from dial_xl.client import Client
from dial_xl.project import Project
from public import public

from dial.xl.assistant.utils.xl.create import create_project


@public
async def copy_project(client: Client, project: Project) -> Project:
    """Perform project deep copy.

    Parameters
    ----------
    client : Client
        DIAL XL Client for API calls.
    project : Project
        Project to copy from.

    Returns
    -------
    Project
        Deep copy of project.

    Notes
    -----
    Currently, DIAL XL API library does not support local project deep cloning,
    therefore, several API calls must be made to reparse original project.

    """

    return await create_project(client, project.name, project.to_dsl())
