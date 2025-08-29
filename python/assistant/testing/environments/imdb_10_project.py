import pytest

from testing.framework import FrameProject


@pytest.fixture
async def imdb_10_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("imdb_10.dsl", "IMDB")
    return project
