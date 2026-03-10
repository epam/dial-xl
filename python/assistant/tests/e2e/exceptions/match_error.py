from tests.e2e.exceptions.test_error import TestError


class MatchError(TestError):
    def __init__(self, selectors: str, *, negative: bool = False) -> None:
        message = (
            "Failed to match expected and actual actions.\n"
            if not negative
            else "Matched action that shouldn't have been matched.\n"
        )
        super().__init__(message + selectors)
