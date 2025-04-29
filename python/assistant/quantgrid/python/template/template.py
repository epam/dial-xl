from typing import Any, cast

from quantgrid.python.template.type_variable import TypeVariable


class Template(type):
    def __init__(
        cls,
        name: str,
        bases: tuple[type, ...],
        attrs: dict[str, Any],
        wildcard: type | None = None,
    ):
        super().__init__(name, bases, attrs)

        cls._type_origin: Template = cls
        cls._type_variables: dict[TypeVariable, type[Any] | None] = (
            cls._collect_bases_type_variables()
        )
        cls._wildcard: type | None = wildcard

    @classmethod
    def create(mcs, *variables: TypeVariable) -> "Template":
        new_type = Template("__template__", (), {})
        new_type._type_variables = {variable: None for variable in variables}

        return new_type

    def parametrize[
        T: "Template"
    ](cls: T, parameters: dict[TypeVariable, type[Any]]) -> T:
        return cls._parametrize(parameters)

    def parameter(cls, type_variable: TypeVariable) -> type | None:
        parameter = cls._type_variables.get(type_variable, None)
        return None if isinstance(parameter, TypeVariable) else parameter

    def type_variables(cls) -> dict[TypeVariable, type | None]:
        return dict(cls._type_variables)

    def type_origin(cls) -> "Template":
        return cls._type_origin

    # region Internal Utility

    def _parametrize[
        T: "Template"
    ](cls: T, parametrization: dict[TypeVariable, type[Any]]) -> T:
        new_type_variables: dict[TypeVariable, type[Any] | None] = dict()
        for type_var, parameter in cls._type_variables.items():
            if parameter is None:
                new_type_variables[type_var] = parametrization.get(type_var, None)
            elif isinstance(parameter, Template):
                new_type_variables[type_var] = parameter._parametrize(parametrization)
            elif isinstance(parameter, TypeVariable):
                new_type_variables[type_var] = parametrization.get(parameter, parameter)
            else:
                new_type_variables[type_var] = parameter

        new_type = Template(cls.__name__, cls.__bases__, dict(cls.__dict__))
        new_type._type_origin = cls._type_origin
        new_type._type_variables = new_type_variables
        new_type._wildcard = cls._type_origin._wildcard

        return cast(T, new_type)

    # TODO[Backlog][Functionality]: Resolve potential conflict on multiple Generic __bases__.
    def _collect_bases_type_variables(cls) -> dict[TypeVariable, type[Any] | None]:
        type_variables: dict[TypeVariable, type[Any] | None] = dict()
        for base in cls.__bases__:
            if not isinstance(base, Template):
                continue

            type_variables.update(
                {
                    type_var: parameter
                    for type_var, parameter in base._type_variables.items()
                    if parameter is None or isinstance(parameter, TypeVariable)
                }
            )

        return type_variables

    # endregion

    # region __dunder__

    # TODO[Typing][Runtime Generics]: _bottom_type is realistically workaround to allow issubclass(Array[], Array[int])
    def __subclasscheck__(cls, subclass) -> bool:
        if not isinstance(subclass, Template):
            return False

        if not super(Template, cls._type_origin).__subclasscheck__(
            subclass._type_origin
        ):
            return False

        for type_var, parameter in subclass._type_variables.items():
            cls_parameter = cls._type_variables.get(type_var, None)

            if cls_parameter is None or isinstance(cls_parameter, TypeVariable):
                continue

            if cls._wildcard is not None and parameter is cls._wildcard:
                continue

            if parameter is None or isinstance(parameter, TypeVariable):
                return False

            if not cls_parameter.__subclasscheck__(parameter):
                return False

        return True

    def __instancecheck__(cls, instance) -> bool:
        return issubclass(type(instance), cls)

    def __eq__(cls, other) -> bool:
        if not isinstance(other, Template):
            return False

        return issubclass(cls, other) and issubclass(other, cls)

    def __str__(cls) -> str:
        if not len(cls._type_variables):
            return cls.__name__

        parametrization = ", ".join(
            (
                f"{type_var}: {parameter}"
                if parameter is not None or isinstance(parameter, TypeVariable)
                else f"{type_var}"
            )
            for type_var, parameter in cls._type_variables.items()
        )

        return f"{cls.__name__}[{parametrization}]"

    def __hash__(cls) -> int:
        return hash(cls.__name__)

    def __init_subclass__(cls, *args, **kwargs):
        super().__init_subclass__()

    # endregion
