from tests.e2e.exceptions.test_error import TestError


class ScoreError(TestError):
    def __init__(self) -> None:
        super().__init__("Failed to generate sufficient solution.")
