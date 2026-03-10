import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def all_actions_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("all_actions.dsl", "AllActions")
    return project
