import pytest

from dial_xl.dial import _project_to_sheets, _sheets_to_project


@pytest.mark.asyncio
def test_project_to_sheets():
    project = """
Sheet 1: |
  table A
    [a] = 1
   
Sheet 2: |
  table B
    [b] = 2

/extra: unsupported
"""
    actual = _project_to_sheets(project)
    assert actual == {
        "Sheet 1": """table A
  [a] = 1
 
""",
        "Sheet 2": """table B
  [b] = 2
""",
    }


@pytest.mark.asyncio
def test_sheets_to_project():
    sheets = {
        "Sheet 1": """table A
  [a] = 1
 
""",
        "Sheet 2": """table B
  [b] = 2
""",
    }

    actual = _sheets_to_project(sheets)

    assert (
        actual
        == """Sheet 1: |
  table A
    [a] = 1
   
Sheet 2: |
  table B
    [b] = 2
"""
    )
