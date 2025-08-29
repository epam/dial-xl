from quantgrid.python.exceptions import XLCompileError, XLExecError
from quantgrid.python.runtime.tables.compilable_function import CompilableFunction
from quantgrid.python.runtime.tables.static_field import StaticField
from quantgrid.python.runtime.types import Type


class Field[T: Type](StaticField[T]):
    def __init__(self, *args, **kwargs):
        kwargs["dim"] = False
        super().__init__(*args, **kwargs)

    def validate_return_value(
        self, function: CompilableFunction, return_value: Type
    ) -> XLExecError | None:
        if not isinstance(return_value, self.value_type):
            return XLCompileError(
                f"{Field.__name__} {self.var_name} function {function.function.__name__} type mismatch."
                f"Expected: {self.value_type}, actual: {return_value}."
            )

        return None
