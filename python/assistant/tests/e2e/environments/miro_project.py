import pytest

from tests.e2e.framework.frame_project import FrameProject


@pytest.fixture
async def miro_project(project: FrameProject) -> FrameProject:
    await project.load_sheet("miro_export.dsl", "MiroExport")
    await project.load_sheet("dial_cards.dsl", "DialCards")
    return project
