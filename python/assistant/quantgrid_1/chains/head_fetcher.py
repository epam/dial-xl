from time import time

from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.utils.formatting import get_markdown_table_values
from quantgrid_1.utils.stages import replicate_stages
from quantgrid_1.utils.viewports import get_project_viewports

STAGE_NAME = "Data Fetching"


async def head_fetcher(inputs: dict) -> dict:
    choice = ChainParameters.get_choice(inputs)
    project = ChainParameters.get_imported_project(inputs)
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters

    actions_generation_method = parameters.actions_generation_method

    if actions_generation_method == StageGenerationMethod.SKIP:
        inputs[ChainParameters.TABLE_DATA] = None
        return inputs

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        replicate_stages(choice, parameters.saved_stages, STAGE_NAME)
        inputs[ChainParameters.TABLE_DATA] = None
        return inputs

    with ChainParameters.get_choice(inputs).create_stage(STAGE_NAME) as stage:
        start_time = time()
        await project.compile()
        # after we got field types we can calculate considering date format
        typed_viewports = get_project_viewports(project, consider_date_type=True)
        await project.calculate(typed_viewports)

        printed_tables: dict[str, str] = {}
        for sheet in project.sheets:
            for table in sheet.tables:
                printed_tables[table.name] = get_markdown_table_values(
                    table, include_warning=False
                )

        printed_project = "\n\n".join(printed_tables.values())

        stage.append_content(printed_project)
        stage.append_name(f" ({round(time() - start_time, 2)} s)")
        stage.close()

        inputs[ChainParameters.TABLE_DATA] = printed_project

        return inputs


def build_head_fetcher_chain() -> Runnable:  # type: ignore
    return RunnableLambda(head_fetcher)
