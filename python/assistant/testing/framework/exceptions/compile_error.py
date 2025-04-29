from testing.framework.exceptions.test_error import TestError


class CompileError(TestError):
    def __init__(self):
        super().__init__("Failed to compile generated project.")
