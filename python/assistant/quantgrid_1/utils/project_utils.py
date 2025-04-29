from typing import Dict
from uuid import uuid4

from dial_xl.client import Client
from dial_xl.dial import _get_project_sheets
from dial_xl.sheet import _parse_sheet

from quantgrid_1.chains.parameters import ChainParameters, URLParameters
from quantgrid_1.models.project import Project


async def load_project(inputs: dict, project_name: str) -> Project:
    sheets, version = await _get_project_sheets(
        ChainParameters.get_url_parameters(inputs).dial_url,
        project_name,
        ChainParameters.get_url_parameters(inputs).credential,
    )

    url_parameters = ChainParameters.get_url_parameters(inputs)

    return Project(
        original_name=project_name,
        rest_base_url=url_parameters.qg_url,
        dial_base_url=url_parameters.dial_url,
        name=project_name,
        base_version=version,
        sheets={
            sheet_name: await _parse_sheet(
                url_parameters.qg_url,
                sheet_name,
                dsl,
                url_parameters.credential,
            )
            for sheet_name, dsl in sheets.items()
        },
        credential_provider=url_parameters.credential,
    )


async def create_project(
    url_parameters: URLParameters,
    client: Client,
    project_name: str,
    sheets: Dict[str, str],
) -> Project:
    project = Project(
        project_name,
        url_parameters.qg_url,
        url_parameters.dial_url,
        str(uuid4()),
        url_parameters.credential,
    )

    for sheet_name in sheets:
        project.add_sheet(
            await client.parse_sheet(
                sheet_name,
                (
                    sheets[sheet_name] + "\n"
                    if len(sheets[sheet_name]) == 0 or sheets[sheet_name][-1] != "\n"
                    else sheets[sheet_name]
                ),
            )
        )

    return project
