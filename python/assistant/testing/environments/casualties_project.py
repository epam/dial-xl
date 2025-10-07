import pytest

from testing.framework import FrameProject


@pytest.fixture
async def casualties_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("casualties_indicators.dsl", "Main")
    return project
