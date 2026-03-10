import inspect

from attrs import frozen
from public import private, public

INTEGRATION_DIR = "integration"
BUSINESS_DIR = "business"


@public
def fetch_most_relevant_exception(
    exceptions: list[Exception | None],
) -> BaseException | None:
    relevant_exception: BaseException | None = None
    relevant_exception_info = ExceptionInfo(in_test_file=False, line_number=0)

    for exception in exceptions:
        if exception is None:
            continue

        bottom_exception: BaseException = exception
        while bottom_exception.__cause__:
            bottom_exception = bottom_exception.__cause__

        exception_info = fetch_exception_row_number(bottom_exception)

        # This is heuristic that selects
        #   which exception is the best explanation of why there is no match.
        # We prioritize exception risen in the test file directly.
        # Next priority is the furthest line number in test file the code achieved.
        if exception_info is not None and relevant_exception_info < exception_info:
            relevant_exception_info = exception_info
            relevant_exception = bottom_exception

    return relevant_exception


@private
@frozen(order=True)
class ExceptionInfo:
    in_test_file: bool
    line_number: int


@private
def fetch_exception_row_number(
    exception: BaseException,
) -> ExceptionInfo | None:
    if (traceback := exception.__traceback__) is None:
        return None

    frames = inspect.getouterframes(traceback.tb_next.tb_frame)  # type: ignore

    for i, frame in enumerate(frames):
        if BUSINESS_DIR in frame.filename or INTEGRATION_DIR in frame.filename:
            return ExceptionInfo(
                in_test_file=i == 0,
                line_number=frame.lineno,
            )

    return None
