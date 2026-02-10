from collections.abc import Iterable
from time import time

from aidial_sdk.chat_completion import Choice
from aidial_sdk.chat_completion import Stage as ChoiceStage

from quantgrid_1.models.stage import Stage


def replicate_stages(choice: Choice, stages: Iterable[Stage], prefix: str) -> None:
    filtered_stages = [stage for stage in stages if stage.name.startswith(prefix)]

    for stage in filtered_stages:
        with choice.create_stage(stage.name) as replicated_stage:
            replicated_stage.append_content(stage.content)


def append_duration(stage: ChoiceStage, start_time: float):
    stage.append_name(f" ({round(time() - start_time, 2)} s)")


def append_token_info(
    stage: ChoiceStage, *, input_token_count: int | None, output_token_count: int | None
) -> None:
    if input_token_count is not None:
        stage.add_attachment(title="input_token_count", data=str(input_token_count))

    if output_token_count is not None:
        stage.add_attachment(title="output_token_count", data=str(output_token_count))
