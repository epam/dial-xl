from typing import cast

from langchain_core.runnables import Runnable, RunnableLambda, RunnableParallel

from quantgrid_1.chains.action_route import build_action_route_chain
from quantgrid_1.chains.changed_sheets_publisher import (
    build_prepare_changed_sheets_chain,
    build_publish_changed_sheets_chain,
)
from quantgrid_1.chains.classifier import build_classify_chain
from quantgrid_1.chains.embeddings import build_embeddings_chain
from quantgrid_1.chains.head_fetcher import build_head_fetcher_chain
from quantgrid_1.chains.history_builder import build_history_chain
from quantgrid_1.chains.import_csv import build_import_csv
from quantgrid_1.chains.materializer import build_materialize_chain
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.chains.question_saver import (
    build_question_saver_chain,
    build_standalone_question_chain,
)
from quantgrid_1.chains.state import build_state_save_chain


async def _merge_parallel_results(inputs: dict):
    flattened = inputs["main"]
    flattened[ChainParameters.STANDALONE_QUESTION] = inputs["standalone_question"]

    return flattened


def route(inputs: dict) -> Runnable:
    messages = ChainParameters.get_messages(inputs)
    user_request = cast(str, messages[-1].content)

    chain = build_import_csv()

    if len(user_request):
        main_chain = chain | (
            build_classify_chain()
            | build_embeddings_chain()
            | build_head_fetcher_chain()
            | build_history_chain()
            | build_action_route_chain()
            | build_prepare_changed_sheets_chain()
        )

        chain = RunnableParallel(
            {
                "main": main_chain,
                "standalone_question": build_standalone_question_chain(),
            }
        ) | RunnableLambda(_merge_parallel_results)

    chain |= (
        build_question_saver_chain()
        | build_publish_changed_sheets_chain()
        | build_state_save_chain()
        | build_materialize_chain()
    )

    return chain


def build_main_route_chain() -> Runnable:
    return RunnableLambda(route)
