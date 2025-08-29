import functools
import inspect

from typing import Any, cast

from quantgrid.python.exceptions import XLCompileError, XLExecError, XLPythonError
from quantgrid.python.runtime.nodes import EmptyReference, GlobalFunction
from quantgrid.python.runtime.nodes.misc.field_enter import FieldEnter
from quantgrid.python.runtime.protocols import FunctionProtocol, TableProtocol
from quantgrid.python.runtime.types import Number, RowRef, Type
from quantgrid.python.runtime.utils import function_util
from quantgrid.python.tree import PYTHON_TRANSFORMER, PYTHON_VALIDATOR


class CompilableFunction:
    def __init__(self, func: FunctionProtocol[..., Type]):
        functools.update_wrapper(self, func)

        self._func = func
        self._module = function_util.parse_module(func)

    def __call__(
        self, owner: type[TableProtocol], namespace: dict[str, Any]
    ) -> XLExecError | Type:
        if (
            validation_error := function_util.validate_module(
                self._module, PYTHON_VALIDATOR
            )
        ) is not None:
            return validation_error

        try:
            self._prevalidate_arguments()
            function_return_type = self._resolve_return_type()
            function_arguments = self._resolve_arguments(owner)
        except XLExecError as exc:
            return exc

        compiled = function_util.compile_function(self._module, PYTHON_TRANSFORMER)
        namespace = self._func.__globals__ | namespace

        try:
            exec(compiled, namespace)
            field_function = namespace[self._func.__name__]
            field_formula: Type = field_function(**function_arguments)
        except XLExecError as exc:
            return exc
        except (AttributeError, TypeError, NameError) as exc:
            return XLCompileError.from_exception(exc)

        if not isinstance(field_formula, function_return_type):
            return XLCompileError(
                f"{self.function.__name__} return type mismatch. "
                f"Expected:{function_return_type}, actual: {field_formula}. "
            )

        return function_return_type(FieldEnter(field_formula.node))

    @property
    def function(self) -> FunctionProtocol[..., Type]:
        return self._func

    # region Signature Resolving

    def _prevalidate_arguments(self):
        type_hints = inspect.get_annotations(self._func)
        signature = inspect.signature(self._func)

        if any(
            param.kind in (param.VAR_KEYWORD, param.VAR_POSITIONAL)
            for param in signature.parameters.values()
        ):
            raise XLPythonError(
                f"Field functions does not support variable-length arguments, "
                f"but function {self._func.__name__} expects: {signature.parameters.values()}"
            )

        for param_name in signature.parameters:
            if param_name not in type_hints:
                raise XLPythonError(
                    f"Field function must be fully type annotated, "
                    f"but {self._func.__name__} argument {param_name} is not annotated."
                )

    def _resolve_return_type(self) -> type[Type]:
        return function_util.resolve_return_type(self._func, Type)

    def _resolve_arguments(
        self, owner: type[TableProtocol]
    ) -> dict[str, Number | RowRef]:
        signature = inspect.signature(self._func)

        unmatched_params = dict(signature.parameters)
        matched_params: dict[str, Number | RowRef] = {}

        number_argument: str | None = None
        ref_argument: str | None = None

        for param_name in signature.parameters:
            param_type = function_util.resolve_parameter_type(
                self._func, param_name, Type
            )

            if issubclass(param_type, Number) and number_argument is None:
                number_argument = param_name

                matched_params[param_name] = Number(GlobalFunction("ROW"))
                del unmatched_params[param_name]

            if (
                issubclass(param_type, RowRef)
                and ref_argument is None
                and issubclass(owner, param_type.table_type())
            ):
                ref_argument = param_name

                matched_params[param_name] = RowRef[TableProtocol].of_type(
                    cast(TableProtocol, owner)
                )(EmptyReference())
                del unmatched_params[param_name]

        if len(unmatched_params):
            raise XLCompileError(
                f"Cannot match the following {self._func.__name__} parameters: {unmatched_params.keys()}."
            )

        return matched_params

    # endregion
