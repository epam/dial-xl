from tests.e2e.exceptions.test_error import TestError


class CompileError(TestError):
    def __init__(self) -> None:
        super().__init__("Failed to compile generated project.")
