import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def imdb_10_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("imdb_10.dsl", "IMDB")
    return project
