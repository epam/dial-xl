from langchain_core.runnables import Runnable, RunnableLambda

from quantgrid_1.chains.parameters import ChainParameters


def state_save(inputs: dict) -> dict:
    ChainParameters.get_choice(inputs).set_state(
        ChainParameters.get_state(inputs).model_dump()
    )

    return inputs


def build_state_save_chain() -> Runnable:
    return RunnableLambda(state_save)
