import pydantic

from dial_xl.project import Project
from dial_xl.table import Table


class ToolArtifact(pydantic.BaseModel, arbitrary_types_allowed=True):
    output: str

    project: Project | None = None

    changed_table: Table | None = None
    changed_table_schema: str = ""
    changed_table_snippet: str = ""

    def is_failed(self) -> bool:
        return self.project is None
