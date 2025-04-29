import pydantic


class ExecuteCodeCommand(pydantic.BaseModel, title="commit_code"):
    """Commits code to DIAL XL environment and return interpreter output.

    1. Commited python code is executed.
    2. DIAL XL Framework collect defined DIAL XL `Table` classes.
    3. DIAL XL Framework compiles decorated linked functions.

    :returns:
    - If python code execution or compilation is failed, then environment change is reverted to the previous stable state and runtime error is returned.
    - If both python code and DIAL XL compilation succeeds, then corresponding status message returns.

    :raises:
    - `XLPythonError`: If python code execution fails.
    - `XLCompileError`: If DIAL XL compilation phase fails.
    """

    code: str = pydantic.Field(description="DIAL XL Framework code to commit.")

    @staticmethod
    def merge_calls(left: dict[str, str], right: dict[str, str]) -> dict[str, str]:
        return {"code": left["code"] + right["code"]}
