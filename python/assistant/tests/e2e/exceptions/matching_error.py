from tests.e2e.exceptions.test_error import TestError


class ExpectedActionAssertionError(TestError):
    def __init__(self, message: str) -> None:
        super().__init__(message)
