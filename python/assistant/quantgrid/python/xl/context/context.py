from contextvars import ContextVar
from textwrap import indent
from typing import TYPE_CHECKING, Literal

if TYPE_CHECKING:
    from quantgrid.python.xl.types.base import Type


class MainFunction:
    def __init__(
        self,
        table_var_name: str,
        field_var_name: str,
        function_name: str,
        parameters: dict[str, str],
        return_annotation: str,
    ):
        self._table_var_name = table_var_name
        self._field_var_name = field_var_name

        self._function_name = function_name
        self._parameters = parameters
        self._return_annotation = return_annotation

        self._nested_functions: list[NestedFunction] = []
        self._expression = ""

    def __enter__(self) -> "MainFunction":
        self._token = COMPILED_CODE.set(self)
        return self

    def remove_parameter(self, name: str) -> None:
        if name in self._parameters:
            del self._parameters[name]

    def add_parameter(self, name: str, annotation: str) -> None:
        self._parameters[name] = annotation

    def nested_function(self, nested_function: "NestedFunction") -> str:
        if not any(
            node.function_name == nested_function.function_name
            for node in self._nested_functions
        ):
            self._nested_functions.append(nested_function)
            return nested_function.function_name

        index = 1
        while any(
            node.function_name == f"{nested_function.function_name}_{index}"
            for node in self._nested_functions
        ):
            index += 1

        self._nested_functions.append(nested_function)
        return f"{nested_function.function_name}_{index}"

    def set_expression(self, expression: str):
        self._expression = expression

    def code(self) -> str:
        parameters = ", ".join(
            f"{name}: {annotation}" for name, annotation in self._parameters.items()
        )
        nested_function_block = "\n".join(
            indent(node.code(), "    ") for node in self._nested_functions
        )
        if len(self._nested_functions):
            nested_function_block += "\n"

        return (
            f"@{self._table_var_name}.{self._field_var_name}\n"
            f"def {self._function_name}({parameters}) -> {self._return_annotation}:\n"
            f"{nested_function_block}"
            f"    return {self._expression}\n"
        )

    def __exit__(self, exc_type, exc_val, exc_tb) -> Literal[False]:
        COMPILED_CODE.reset(self._token)
        return False


class NestedFunction:
    def __init__(
        self, function_name: str, param_name: str, param_type: "Type", return_type: str
    ):
        self._function_name = function_name
        self._param_name = param_name
        self._param_type = param_type
        self._return_type = return_type

        self._expression = ""

    def __enter__(self) -> "NestedFunction":
        self._token = NESTED_FUNCTION.set(self)
        self._function_name = COMPILED_CODE.get().nested_function(self)
        return self

    def set_expression(self, expression: str):
        self._expression = expression

    @property
    def function_name(self) -> str:
        return self._function_name

    @property
    def param_name(self) -> str:
        return self._param_name

    @property
    def param_type(self) -> "Type":
        return self._param_type

    @property
    def return_type(self) -> str:
        return self._return_type

    def code(self) -> str:
        return (
            f"def {self._function_name}({self._param_name}: {self._param_type.type_annotation}) -> {self._return_type}:\n"
            f"    return {self._expression}\n"
        )

    def __exit__(self, exc_type, exc_val, exc_tb) -> Literal[False]:
        NESTED_FUNCTION.reset(self._token)
        return False


COMPILED_CODE: ContextVar[MainFunction] = ContextVar("__quantgrid_main_function")
NESTED_FUNCTION: ContextVar[NestedFunction | None] = ContextVar(
    "__quantgrid_nested_function", default=None
)
