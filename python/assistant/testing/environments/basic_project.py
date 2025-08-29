import pytest

from testing.framework import FrameProject


@pytest.fixture
async def basic_project(project: FrameProject) -> FrameProject:
    await project.create_sheet("Main", "\n")
    return project
