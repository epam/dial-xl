from aidial_sdk.chat_completion import Choice
from aidial_sdk.chat_completion.form import form
from aidial_sdk.pydantic_v1 import Field
from aiohttp import ClientResponseError
from dial_xl.client import Client
from dial_xl.project import Project
from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters, URLParameters
from quantgrid_1.log_config import qg_logger
from quantgrid_1.models.materialize_button import MaterializeButton
from quantgrid_1.utils.project_utils import create_project


async def materialize(inputs: dict) -> dict:
    snapshot = (
        ChainParameters.get_fixed_project(inputs)
        if ChainParameters.FIX_PROJECT in inputs
        else ChainParameters.get_imported_project(inputs)
    )

    bucket = ChainParameters.get_bucket(inputs)
    choice = ChainParameters.get_choice(inputs)
    client = ChainParameters.get_client(inputs)
    messages = ChainParameters.get_messages(inputs)
    parameters = ChainParameters.get_request_parameters(inputs)
    url_parameters = ChainParameters.get_url_parameters(inputs)

    save_path = MaterializeButton.extract_path(messages[-1])
    if save_path is not None:
        await _save_project_as(choice, client, url_parameters, snapshot, save_path)

    if parameters.generation_parameters.materialize:
        _propose_materialize(choice, bucket)

    return inputs


async def _save_project_as(
    choice: Choice,
    client: Client,
    url_parameters: URLParameters,
    project: Project,
    path: str,
) -> None:
    saved_project: Project

    try:
        saved_project = await client.parse_project(path)
        for sheet in saved_project.sheets:
            saved_project.remove_sheet(sheet.name)

        for sheet in project.sheets:
            saved_project.add_sheet(
                await client.parse_sheet(sheet.name, sheet.to_dsl())
            )

    except ClientResponseError:
        qg_logger.info(f"No existing project found at {path}, creating new project.")

        saved_project = await create_project(
            url_parameters, client, path, project.to_dsl()
        )

    await saved_project.save()

    project_name = saved_project.name.split("/")[-1]
    choice.add_attachment(title=project_name, type="dial/xl", url=path)


def _propose_materialize(choice: Choice, bucket: str) -> None:
    selector = Field(
        description="DIAL XL Project Creation",
        buttons=[
            MaterializeButton.new_project_button(bucket),
        ],
    )

    form_dumper = form(save_path=selector)(MaterializeButton)
    choice.set_form_schema(form_dumper.schema())


def build_materialize_chain() -> Runnable:
    return RunnableLambda(materialize)
