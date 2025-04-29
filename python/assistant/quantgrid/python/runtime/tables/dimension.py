from quantgrid.python.exceptions import XLCompileError, XLExecError
from quantgrid.python.runtime.tables.compilable_function import CompilableFunction
from quantgrid.python.runtime.tables.static_field import StaticField
from quantgrid.python.runtime.types import Array, Type


class Dimension[T: Type](StaticField[T]):
    def __init__(self, *args, **kwargs):
        kwargs["dim"] = True
        super().__init__(*args, **kwargs)

    def validate_return_value(
        self, function: CompilableFunction, return_value: Type
    ) -> XLExecError | None:
        expected_type: type[Array] = Array.of_type(self.value_type)
        if not isinstance(return_value, expected_type):
            return XLCompileError(
                f"{Dimension.__name__} {self.var_name} function {function.function.__name__} type mismatch."
                f"Expected: {expected_type}, actual: {return_value}."
            )

        return None
