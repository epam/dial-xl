import pytest

from testing.framework import FrameProject


@pytest.fixture
async def miro_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("./testing/resources/miro_export.dsl", "MiroExport")
    await project.load_sheet("./testing/resources/dial_cards.dsl", "DialCards")
    return project
