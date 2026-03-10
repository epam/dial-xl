import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def basic_project(project: FrameProject) -> FrameProject:
    await project.create_sheet("Main", "\n")
    return project
