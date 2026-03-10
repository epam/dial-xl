import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def imdb_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("imdb_50.dsl", "IMDB")
    return project
