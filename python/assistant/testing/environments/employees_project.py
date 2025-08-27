import pytest

from testing.framework import FrameProject


def _build_employees_table_dsl(data_url: str) -> str:
    return f"""
            table Employees
              dim [first_name], [last_name], [seniority_level], [years_on_job] = INPUT("{data_url}")[[first_name], [last_name], [seniority_level], [years_on_job]]
              [ID] = ROW()
            """


def _build_projects_table_dsl(data_url: str) -> str:
    return f"""
            table Projects
              dim [project_id], [project_name], [approximate_cost] = INPUT("{data_url}")[[project_id], [project_name], [approximate_cost]]
            """


def _build_assignments_table_dsl(data_url: str) -> str:
    return f"""
            table Assignments
              dim [employee_id], [project_id] = INPUT("{data_url}")[[employee_id], [project_id]]
            """


async def _build_basic_employees_project(project: FrameProject) -> FrameProject:
    employees_file = open(
        "./testing/resources/employees_project/employees.csv", encoding="utf-8"
    ).read()

    data_url = await project.create_data_file(
        name="employees.csv", content=employees_file
    )

    await project.create_table(
        table_name="Employees",
        code=_build_employees_table_dsl(data_url),
    )

    projects_file = open(
        "./testing/resources/employees_project/projects.csv", encoding="utf-8"
    ).read()

    data_url = await project.create_data_file(
        name="assignments.csv", content=projects_file
    )

    await project.create_table(
        table_name="Projects",
        code=_build_projects_table_dsl(data_url),
    )

    assignments_file = open(
        "./testing/resources/employees_project/assignments.csv", encoding="utf-8"
    ).read()

    data_url = await project.create_data_file(
        name="projects.csv", content=assignments_file
    )

    await project.create_table(
        table_name="Assignments",
        code=_build_assignments_table_dsl(data_url),
    )

    return project


@pytest.fixture
async def employees_project(project: FrameProject) -> FrameProject:
    project = await _build_basic_employees_project(project)
    return project
