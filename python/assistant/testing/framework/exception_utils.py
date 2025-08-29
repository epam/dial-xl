import inspect


def exception_is_in_test(exception: BaseException) -> bool:
    frames = inspect.getouterframes(exception.__traceback__.tb_next.tb_frame)  # type: ignore
    return any(
        ("business_scenarios" in f.filename or "integration_scenarios" in f.filename)
        for f in frames
    )


def exception_get_cause_row_number(exception: BaseException) -> tuple[bool, int] | None:
    frames = inspect.getouterframes(exception.__traceback__.tb_next.tb_frame)  # type: ignore

    for i, f in enumerate(frames):
        if "business_scenarios" in f.filename or "integration_scenarios" in f.filename:
            return i == 0, f.lineno

    return None


def fetch_most_relevant_exceptions_from_list(
    exceptions: list[Exception | None],
) -> BaseException | None:
    most_relevant: BaseException | None = None
    most_relevant_is_top_lo = (False, -1)
    for exception in exceptions:
        if exception:
            bottom_exception: BaseException = exception
            while bottom_exception.__cause__:
                bottom_exception = bottom_exception.__cause__

            is_top_lo = exception_get_cause_row_number(bottom_exception)
            # This is heuristic that selects which exception is the best explanation of why there is no match.
            # We prioritize exception risen in the test file directly
            # Next priority is the furthest line number in test file the code achieved
            if is_top_lo and most_relevant_is_top_lo < is_top_lo:
                most_relevant_is_top_lo = is_top_lo
                most_relevant = bottom_exception

    return most_relevant
