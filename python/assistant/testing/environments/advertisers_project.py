import pytest

from testing.framework import FrameProject


@pytest.fixture
async def advertisers_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("advertisers.dsl", "Data")
    return project


@pytest.fixture
async def advertisers_no_format_project(project: FrameProject) -> FrameProject:
    advertisers_code = await project.load_code("advertisers.dsl")
    advertisers_code_no_format = advertisers_code.replace('!format("number", 0, 0)', "")
    await project.create_sheet("Data", advertisers_code_no_format)
    return project
