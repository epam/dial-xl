from types import CodeType
from typing import Any

from quantgrid.exceptions import XLToolError
from quantgrid.python.exceptions import XLExecError, XLInvariantViolation, XLPythonError
from quantgrid.utils.compilation import with_trimmed_traceback


class PythonExecutor:
    @staticmethod
    def exec(code: CodeType, namespace: dict[str, Any]) -> XLExecError | None:
        try:
            exec(code, namespace)
        except XLInvariantViolation as violation:
            raise XLToolError("Python code invariants are violated.") from violation
        except XLExecError as error:
            return with_trimmed_traceback(error, 1)
        except (NameError, TypeError, AttributeError) as error:
            return XLPythonError.from_exception(with_trimmed_traceback(error, 1))
        except Exception as error:
            raise XLToolError("Unexpected error raised from generated code.") from error

        return None
