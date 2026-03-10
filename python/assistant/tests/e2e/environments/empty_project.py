import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def empty_project(project: FrameProject) -> FrameProject:
    return project
