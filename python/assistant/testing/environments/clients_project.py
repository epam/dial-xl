import pytest

from testing.framework import FrameProject


@pytest.fixture
async def clients_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("./testing/resources/clients.dsl", "Main")
    return project
