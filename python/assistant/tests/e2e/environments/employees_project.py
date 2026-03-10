import anyio
import pytest

from tests.e2e.framework.frame_project import FrameProject


def _build_employees_table_dsl(data_url: str) -> str:
    return (
        f"table Employees\n"
        f"  dim [first_name], [last_name], [seniority_level], [years_on_job] "
        f'= INPUT("{data_url}")'
        f"[[first_name], [last_name], [seniority_level], [years_on_job]]\n"
        f"  [ID] = ROW()\n"
    )


def _build_projects_table_dsl(data_url: str) -> str:
    return (
        f"table Projects\n"
        f"  dim [project_id], [project_name], [approximate_cost] = "
        f'INPUT("{data_url}")[[project_id], [project_name], [approximate_cost]]\n'
    )


def _build_assignments_table_dsl(data_url: str) -> str:
    return (
        f"table Assignments\n"
        f"  dim [employee_id], [project_id] = "
        f'INPUT("{data_url}")[[employee_id], [project_id]]\n'
    )


async def _build_basic_employees_project(project: FrameProject) -> FrameProject:
    async with await anyio.open_file(
        "./testing/resources/employees_project/employees.csv", encoding="utf-8"
    ) as employees_file:
        data_url = await project.create_data_file(
            name="employees.csv", content=await employees_file.read()
        )

    await project.create_table(
        table_name="Employees",
        code=_build_employees_table_dsl(data_url),
    )

    async with await anyio.open_file(
        "./testing/resources/employees_project/projects.csv", encoding="utf-8"
    ) as projects_file:
        data_url = await project.create_data_file(
            name="assignments.csv", content=await projects_file.read()
        )

    await project.create_table(
        table_name="Projects",
        code=_build_projects_table_dsl(data_url),
    )

    async with await anyio.open_file(
        "./testing/resources/employees_project/assignments.csv", encoding="utf-8"
    ) as assignments_file:
        data_url = await project.create_data_file(
            name="projects.csv", content=await assignments_file.read()
        )

    await project.create_table(
        table_name="Assignments",
        code=_build_assignments_table_dsl(data_url),
    )

    return project


@pytest.fixture
async def employees_project(project: FrameProject) -> FrameProject:
    return await _build_basic_employees_project(project)
