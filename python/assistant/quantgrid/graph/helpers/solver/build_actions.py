from dial_xl.project import Project

from quantgrid.models import AnyAction
from quantgrid.utils.project import ProjectUtil


def build_actions(
    project_util: ProjectUtil, user_project: Project, ai_project: Project
) -> list[AnyAction]:
    return project_util.project_difference(user_project, ai_project)
