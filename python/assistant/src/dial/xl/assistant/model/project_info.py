from attrs import frozen
from public import public

from dial.xl.assistant.dto.project_state import SelectionDTO


@public
@frozen
class ProjectInfo:
    project_path: str
    project_appdata: str | None

    selection: SelectionDTO | None
