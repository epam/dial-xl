import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def countries_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("countries_indicators.dsl", "Main")
    return project
