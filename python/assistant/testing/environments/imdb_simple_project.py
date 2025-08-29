import pytest

from testing.framework import FrameProject


@pytest.fixture
async def imdb_simple_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("imdb_20.dsl", "IMDB")
    return project
