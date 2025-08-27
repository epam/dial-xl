from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.models.project_state import ProjectState


async def state_save(inputs: dict) -> dict:
    snapshot = (
        ChainParameters.get_fixed_project(inputs)
        if ChainParameters.FIX_PROJECT in inputs
        else ChainParameters.get_imported_project(inputs)
    )

    app_state = ChainParameters.get_state(inputs).model_dump()
    original_state = ChainParameters.get_original_project_state(inputs)

    sheet_name = (
        original_state.sheet_name
        if original_state.sheet_name is not None
        and original_state.sheet_name in snapshot.sheet_names
        else None
    )

    selection = original_state.selection if sheet_name is not None else None

    # https://github.com/koxudaxi/pydantic-pycharm-plugin/issues/937
    state = ProjectState(
        input_folder=original_state.input_folder,  # type: ignore
        project_name=original_state.project_name,  # type: ignore
        selection=selection,
        sheet_name=sheet_name,  # type: ignore
        sheets=snapshot.to_dsl(),
    ).dump()

    state |= {"actions_history": app_state["actions_history"]}

    ChainParameters.get_choice(inputs).set_state(state)
    return inputs


def build_state_save_chain() -> Runnable:
    return RunnableLambda(state_save)
