from testing.framework.exceptions.test_error import TestError


class MatchingError(TestError):
    def __init__(self, message: str):
        super().__init__(message)
