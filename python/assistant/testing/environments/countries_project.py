import pytest

from testing.framework import FrameProject


@pytest.fixture
async def countries_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("countries_indicators.dsl", "Main")
    return project
