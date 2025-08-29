import traceback

from aidial_sdk.chat_completion import Choice

from quantgrid.utils.string import code_snippet


def create_exception_stage(choice: Choice, exception: Exception) -> None:
    with choice.create_stage(f"Exception: {type(exception).__name__}") as stage:
        stack_trace = traceback.format_exception(exception)
        stage.append_content(code_snippet("text", "".join(stack_trace)))
