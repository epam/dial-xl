import pytest

from testing.framework import FrameProject


@pytest.fixture
async def empty_project(project: FrameProject) -> FrameProject:
    return project
