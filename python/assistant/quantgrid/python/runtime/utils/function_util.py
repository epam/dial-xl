import inspect
import textwrap

from types import CodeType
from typing import TYPE_CHECKING, get_args, get_origin, get_type_hints

import libcst as cst

from quantgrid.configuration import Env
from quantgrid.python.exceptions import XLCompileError, XLPythonError
from quantgrid.python.runtime.protocols import FunctionProtocol
from quantgrid.python.tree import PYTHON_VALIDATOR, ASTTransformer, ASTValidator
from quantgrid.utils.compilation import VirtualDirectory

if TYPE_CHECKING:
    from quantgrid.python.runtime.types.base_type import Type


def parse_module(func: FunctionProtocol) -> cst.Module:
    original_code = textwrap.dedent(inspect.getsource(func))
    return cst.parse_module(original_code)


def validate_module(
    module: cst.Module, validator: ASTValidator
) -> XLCompileError | None:
    report = validator.validate(module)
    if not len(report.validation_errors):
        return None

    return XLCompileError("\n\n".join(PYTHON_VALIDATOR.format_report(report)))


def compile_function(
    module: cst.Module,
    transformer: ASTTransformer,
    virtual_directory: str = Env.TEMPORARY_DIR,
) -> CodeType:
    with VirtualDirectory(virtual_directory) as directory:
        return directory.compile(transformer.convert(module).code)


def resolve_parameter_type[
    T: Type
](func: FunctionProtocol, parameter_name: str, expected_type: type[T]) -> type[T]:
    type_hints = get_type_hints(func, {}, func.__globals__)

    type_hint = type_hints[parameter_name]
    origin = get_origin(type_hint) or type_hint

    if not issubclass(origin, expected_type):
        raise XLPythonError(
            f"Unexpected parameter {parameter_name} annotation in {func.__name__}. "
            f"Expected: {expected_type}, actual: {origin}."
        )

    try:
        return origin.from_annotation(*get_args(type_hint))
    except AttributeError as attr_error:
        raise XLPythonError.from_exception(attr_error)


def resolve_return_type[
    T: Type
](func: FunctionProtocol[..., T], expected_type: type[T]) -> type[T]:
    type_hints = get_type_hints(func, {}, func.__globals__)
    if "return" not in type_hints:
        raise XLCompileError(
            f"Function {func.__name__} is missing return type annotation."
        )

    return_hint = type_hints["return"]
    origin = get_origin(return_hint) or return_hint

    if not issubclass(origin, expected_type):
        raise XLPythonError(
            f"Unexpected return type annotation in {func.__name__}. "
            f"Expected: {expected_type}, actual: {origin}."
        )

    try:
        return origin.from_annotation(*get_args(return_hint))
    except AttributeError as attr_error:
        raise XLPythonError.from_exception(attr_error)


__all__ = [
    "parse_module",
    "validate_module",
    "compile_function",
    "resolve_parameter_type",
    "resolve_return_type",
]
