import pytest

from testing.framework import FrameProject


@pytest.fixture
async def imdb_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("./testing/resources/imdb_50.dsl", "IMDB")
    return project
