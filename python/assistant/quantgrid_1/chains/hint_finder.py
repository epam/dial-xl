import logging
import typing

from aidial_sdk import HTTPException
from langchain_core.runnables import Runnable, RunnableLambda
from pydantic import TypeAdapter

from quantgrid.exceptions import XLInvalidLLMOutput, XLLLMUnavailable
from quantgrid.graph.output import HintRelevancyClass, HintSelectionResponse
from quantgrid.models import ProjectHint
from quantgrid.startup import load_hints_human, load_hints_system
from quantgrid.startup.load_project import load_hints_from
from quantgrid.utils.llm import LLMConsumer, ainvoke_model, parse_structured_output
from quantgrid.utils.string import code_snippet
from quantgrid_1.chains.parameters import ChainParameters
from quantgrid_1.models.stage_generation_type import StageGenerationMethod
from quantgrid_1.utils.stages import replicate_stages

STAGE_NAME = "Finding Relevant Hint"


async def hint_finder(inputs: dict):
    model = ChainParameters.get_ai_hint_model(inputs)
    choice = ChainParameters.get_choice(inputs)
    input_folder = ChainParameters.get_input_folder(inputs)
    messages = ChainParameters.get_messages(inputs)
    dial_api = ChainParameters.get_dial_api(inputs)
    parameters = ChainParameters.get_request_parameters(inputs).generation_parameters

    actions_generation_method = parameters.actions_generation_method

    if actions_generation_method == StageGenerationMethod.SKIP:
        inputs[ChainParameters.HINT] = None
        return inputs

    if actions_generation_method == StageGenerationMethod.REPLICATE:
        replicate_stages(choice, parameters.saved_stages, STAGE_NAME)
        inputs[ChainParameters.HINT] = None
        return inputs

    with choice.create_stage(STAGE_NAME) as stage:
        project_hints = await load_hints_from(dial_api, input_folder)

        if project_hints:
            stage.append_content("## Project Hints\n")
            ta = TypeAdapter(list[ProjectHint])
            hints_json = ta.dump_json(
                [hint for hint in project_hints.values()], indent=2
            ).decode("utf-8")
            stage.append_content(code_snippet("json", hints_json))

        if not len(project_hints):
            stage.append_name(": None")
            stage.append_content("No hints available.")
            inputs[ChainParameters.HINT] = None
            return inputs

        user_message = str(messages[-1].content).strip().lower()

        output: HintSelectionResponse | None = None
        for h in project_hints.values():
            match = any(t.strip().lower() == user_message for t in h.triggers)
            if match:
                output = HintSelectionResponse(
                    name=h.name, relevancy_class=HintRelevancyClass.EXACT_MATCH
                )
                break

        if not output:
            structured_model = model.with_structured_output(
                HintSelectionResponse, method="function_calling", include_raw=True
            )

            formatted_hints = "\n\n".join(
                [hint.format_for_hints_selector() for hint in project_hints.values()]
            )

            logging.debug(f"Formatted hints:\n{formatted_hints}")

            response = await ainvoke_model(
                structured_model,
                [
                    load_hints_system(),
                    load_hints_human(str(messages[-1].content), formatted_hints),
                ],
                LLMConsumer(choice),
                5,
                30,
            )

            if isinstance(response, Exception):
                raise XLLLMUnavailable() from response

            _, output, error = parse_structured_output(
                HintSelectionResponse, typing.cast(dict[str, typing.Any], response)
            )

            if error is not None or output is None:
                raise XLInvalidLLMOutput() from error

        # for the case when no hint is selected
        if not output.name:
            stage.append_name(": None")
            stage.append_content("No hint selected.")
            inputs[ChainParameters.HINT] = None
            return inputs

        logging.debug(f"Selected hint: {output}")
        hint = project_hints.get(output.name, None)

        if hint is not None:
            stage.append_name(f": {output.name}")
            stage.append_content(hint.format_for_solver())
            inputs[ChainParameters.HINT] = hint
            return inputs
        else:
            # for the case when hint selected is not in the list of hints
            logging.debug(
                f"Selected hint not found among available hints: {output.name}, "
                f"available: {project_hints.keys()}"
            )
            stage.append_name(": None")
            stage.append_content("No hint selected.")
            inputs[ChainParameters.HINT] = None
            return inputs

    raise HTTPException(
        status_code=502,
        message="Error while interacting with the model",
        type="bad_gateway",
        display_message="Error while interacting with the model",
    )


def build_hints_chain() -> Runnable:
    return RunnableLambda(hint_finder)
