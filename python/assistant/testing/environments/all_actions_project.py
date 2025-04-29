import pytest

from testing.framework import FrameProject


@pytest.fixture
async def all_actions_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("./testing/resources/all_actions.dsl", "AllActions")
    return project
