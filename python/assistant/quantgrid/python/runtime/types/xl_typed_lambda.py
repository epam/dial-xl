import inspect

from typing import cast, get_args, get_origin, get_type_hints

from quantgrid.python.exceptions import XLCompileError
from quantgrid.python.runtime.protocols import FunctionProtocol
from quantgrid.python.runtime.types.base_type import Type
from quantgrid.python.runtime.types.xl_untyped_lambda import XLUntypedLambda
from quantgrid.python.runtime.utils import function_util


# TODO[Python Adapter][LLM Code Freedom]: Make ComputeNode first-class Type citizen
class XLTypedLambda[T: Type](XLUntypedLambda[T]):
    def __init__(self, wrapped: FunctionProtocol[..., T]):
        super().__init__(wrapped)

        self._parameters_types = XLTypedLambda._resolve_parameters(wrapped)
        self._return_type = cast(
            type[T], function_util.resolve_return_type(wrapped, Type)
        )

    def __call__(self, *args: Type, **kwargs: Type) -> T:
        expression = super().__call__(*args, **kwargs)
        if not isinstance(expression, self.return_type()):
            raise XLCompileError(
                f"Function {self.function.__name__} return type mismatch."
                f"Expected: {self.return_type()}, actual: {expression}."
            )

        return cast(T, expression)

    def parameter_type(self, index: int) -> type[Type]:
        return self._parameters_types[index]

    def return_type(self) -> type[T]:
        return self._return_type

    # region Type Match Validation

    # TODO[Prompt][Quality]: Prettify typing. annotations in exceptions (to avoid a.b.c.d.e.f.g.SomeType[a.b.c...]).
    # TODO[Code Style][Consistency]: For god sake, make sure ALL exceptions either ends with dot or not, but unified.
    @staticmethod
    def _resolve_parameters(func: FunctionProtocol[..., T]) -> tuple[type[Type], ...]:
        type_hints = get_type_hints(func)
        signature = inspect.signature(func)

        parameter_types: list[type[Type]] = []
        for parameter in signature.parameters.values():
            if parameter.kind not in (
                parameter.kind.POSITIONAL_OR_KEYWORD,
                parameter.kind.KEYWORD_ONLY,
            ):
                raise XLCompileError(
                    f"Nested functions accept positional arguments only, "
                    f"but {func.__name__} declared {parameter.name} as {parameter.kind.value}."
                )

            if parameter.name not in type_hints:
                raise XLCompileError(
                    f"Nested function must be fully type annotated, "
                    f"but {func.__name__} declared {parameter.name} without type annotation."
                )

            type_hint = type_hints[parameter.name]
            origin = get_origin(type_hint) or type_hint
            if not issubclass(origin, Type):
                raise XLCompileError(
                    f"Only {Type} subtypes are accepted inside nested functions, "
                    f"but {func.__name__} annotated {parameter.name} as {type_hint}."
                )

            parameter_types.append(origin.from_annotation(*get_args(type_hint)))

        return tuple(parameter_types)

    # endregion
