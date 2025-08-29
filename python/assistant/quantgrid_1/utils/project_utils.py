from typing import Dict

from dial_xl.client import Client
from dial_xl.dial import _get_project_sheets
from dial_xl.project import Project
from dial_xl.project import Project as XLProject
from dial_xl.sheet import Sheet, _parse_sheet
from dial_xl.table import Table

from quantgrid_1.chains.parameters import ChainParameters, URLParameters


async def load_project(inputs: dict, project_name: str) -> Project:
    sheets, version = await _get_project_sheets(
        ChainParameters.get_url_parameters(inputs).dial_url,
        project_name,
        ChainParameters.get_url_parameters(inputs).credential,
    )

    url_parameters = ChainParameters.get_url_parameters(inputs)

    return Project(
        rest_base_url=url_parameters.qg_url,
        dial_base_url=url_parameters.dial_url,
        path=project_name,
        credential_provider=url_parameters.credential,
        base_etag=version,
        sheets={
            sheet_name: await _parse_sheet(
                url_parameters.qg_url,
                sheet_name,
                dsl,
                url_parameters.credential,
            )
            for sheet_name, dsl in sheets.items()
        },
    )


async def create_project(
    url_parameters: URLParameters,
    client: Client,
    project_name: str,
    sheets: Dict[str, str],
) -> Project:
    project = Project(
        url_parameters.qg_url,
        url_parameters.dial_url,
        project_name,
        url_parameters.credential,
    )

    for sheet_name in sheets:
        sheet_code = sheets[sheet_name]
        if not len(sheets[sheet_name]) or not sheets[sheet_name].endswith("\n"):
            sheet_code += "\n"

        project.add_sheet(await client.parse_sheet(sheet_name, sheet_code))

    return project


def find_table(
    project: XLProject, table_name: str
) -> tuple[Sheet, Table] | tuple[None, None]:
    for sheet in project.sheets:
        for table in sheet.tables:
            if table.name == table_name:
                return sheet, table

    return None, None
