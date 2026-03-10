import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def clients_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("clients.dsl", "Main")
    return project
