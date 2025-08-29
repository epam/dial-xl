from testing.framework.exceptions.test_error import TestError


class ScoreError(TestError):
    def __init__(self):
        super().__init__("Failed to generate sufficient solution.")
