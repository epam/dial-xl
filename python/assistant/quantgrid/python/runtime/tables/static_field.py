from abc import ABC, abstractmethod
from inspect import get_annotations
from typing import Any, cast, get_args, get_origin, get_type_hints, overload

from quantgrid.python.exceptions import XLExecError, XLPythonError
from quantgrid.python.runtime.protocols import FunctionProtocol, TableProtocol
from quantgrid.python.runtime.tables.base_field import BaseField
from quantgrid.python.runtime.tables.compilable_function import CompilableFunction
from quantgrid.python.runtime.types import Number, Pivot, RowRef, Type
from quantgrid.utils.compilation import StateBox


class StaticField[T: Type](ABC, BaseField):
    _value_type: type[T]
    _var_name: str
    _owner: TableProtocol

    def __init__(self, *, value_type: type[T] | None = None, **kwargs):
        super().__init__(**kwargs)

        self._annotation = value_type
        self._function: StateBox[CompilableFunction | None] = StateBox(None, True)

    @abstractmethod
    def validate_return_value(
        self, function: CompilableFunction, return_value: Type
    ) -> XLExecError | None: ...

    @property
    def annotation(self) -> type[T] | None:
        return self._annotation

    @property
    def function(self) -> StateBox[CompilableFunction | None]:
        return self._function

    @property
    def value_type(self) -> type[T]:
        return self._value_type

    @property
    def var_name(self) -> str:
        return self._var_name

    @property
    def owner(self) -> TableProtocol:
        return self._owner

    @overload
    def __call__(
        self, function: FunctionProtocol[[], Type]
    ) -> FunctionProtocol[[], Type]: ...

    @overload
    def __call__(
        self, function: FunctionProtocol[[Number], Type]
    ) -> FunctionProtocol[[Number], Type]: ...

    @overload
    def __call__(
        self, function: FunctionProtocol[[RowRef], Type]
    ) -> FunctionProtocol[[RowRef], Type]: ...

    @overload
    def __call__(
        self, function: FunctionProtocol[[Number, RowRef], Type]
    ) -> FunctionProtocol[[Number, RowRef], Type]: ...

    @overload
    def __call__(
        self, function: FunctionProtocol[[RowRef, Number], Type]
    ) -> FunctionProtocol[[RowRef, Number], Type]: ...

    def __call__(self, function) -> FunctionProtocol[..., Type]:
        self.function.invalidate_with(CompilableFunction(function))
        return function

    def resolve(
        self,
        global_scope: dict[str, Any] | None = None,
        local_scope: dict[str, Any] | None = None,
    ) -> XLExecError | None:
        try:
            self._resolve_type(global_scope, local_scope)
            if issubclass(self.value_type, Pivot):
                self.ui_name = "*"
        except XLExecError as error:
            return error

        return None

    def compile(self, namespace: dict[str, Any]) -> XLExecError | None:
        if self.function.validated:
            return None

        function: CompilableFunction | None = self.function.stored
        if function is None:
            self.reset_formula()
            self.function.validate_with(None)
            return None

        returned_value = function(cast(type[TableProtocol], self.owner), namespace)
        if isinstance(returned_value, XLExecError):
            return returned_value

        type_validation = self.validate_return_value(function, returned_value)
        if isinstance(type_validation, XLExecError):
            return type_validation

        self.formula = returned_value.node.code
        self.function.validate_with(function)

        return None

    def __set_name__(self, owner: TableProtocol, name: str) -> None:
        self.ui_name = self.ui_name or name

        self._var_name = name
        self._owner = owner

        owner_annotation = self._get_owner_type_hint(evaluate=False)
        if owner_annotation is not None:
            annotation_origin = get_origin(owner_annotation) or owner_annotation
            if not issubclass(annotation_origin, StaticField):
                raise XLPythonError(
                    f"Unexpected annotation for {owner.var_name}.{name}: {owner_annotation}."
                )

            if annotation_origin is not type(self):
                raise XLPythonError(
                    f"Inconsistent annotation for {owner.var_name}.{name}: "
                    f"member annotated as {annotation_origin.__name__}, but initialized as {type(self).__name__}."
                )

    # region Type Resolving

    def _resolve_type(
        self,
        global_scope: dict[str, Any] | None = None,
        local_scope: dict[str, Any] | None = None,
    ) -> None:
        annotated_resolved_type: type | None = None
        owner_annotation = self._get_owner_type_hint(
            evaluate=True, global_scope=global_scope, local_scope=local_scope
        )
        if owner_annotation is not None:
            annotated_resolved_type = self._parse_type(get_args(owner_annotation))

        instance_resolved_type: type | None = None
        if self.annotation is not None:
            instance_resolved_type = self._parse_type((self.annotation,))

        if (
            annotated_resolved_type is not None
            and instance_resolved_type is not None
            and annotated_resolved_type != instance_resolved_type
        ):
            raise XLPythonError(
                f"Annotation mismatch for {self.owner.var_name}.{self.var_name}: "
                f"{annotated_resolved_type} != {instance_resolved_type}."
            )

        if annotated_resolved_type is None and instance_resolved_type is None:
            raise XLPythonError(
                f"{self.owner.var_name}.{self.var_name} is not annotated."
                f"DIAL XL expects `variable: type` annotations or `annotation` keyword parameters."
            )

        self._value_type = cast(
            type[T], instance_resolved_type or annotated_resolved_type
        )

    def _get_owner_type_hint(
        self,
        *,
        evaluate: bool,
        global_scope: dict[str, Any] | None = None,
        local_scope: dict[str, Any] | None = None,
    ) -> type | None:
        owner_type_hints = (
            get_type_hints(self.owner, global_scope, local_scope)
            if evaluate
            else get_annotations(cast(type, self.owner))
        )

        return owner_type_hints.get(self.var_name, None)

    def _parse_type(self, annotation_arguments: tuple[Any, ...]) -> type:
        if len(annotation_arguments) != 1:
            raise XLPythonError(
                f"{self.owner.var_name}.{self.var_name} annotation expected one {Type} type variable, "
                f"but got {len(annotation_arguments)}: {annotation_arguments}."
            )

        annotated_type = annotation_arguments[0]
        type_origin = get_origin(annotated_type) or annotated_type
        if not issubclass(type_origin, Type):
            raise XLPythonError(
                f"Unexpected {self.owner.var_name}.{self.var_name} type variable: {annotated_type}."
            )

        return type_origin.from_annotation(*get_args(annotated_type))

    # endregion
