from typing import Any

from quantgrid.python.runtime.nodes import (
    BoolLiteral,
    NumberLiteral,
    Parenthesis,
    StrLiteral,
)
from quantgrid.python.runtime.protocols import FunctionProtocol
from quantgrid.python.runtime.types import (
    Array,
    Bool,
    Number,
    Primitive,
    Str,
    Type,
    XLTypedLambda,
    XLUntypedLambda,
)


def __len(obj: Array | Str) -> Number:
    return obj.len


def __parenthesis[T: Type](obj: T) -> T:
    return type(obj)(Parenthesis(obj.node))


# region Type Constructors


def __str(string: str) -> Str:
    return Str(StrLiteral(string))


def __f_str(primitive: Primitive) -> Str:
    return primitive.as_string()


def __float(literal: str) -> Number:
    return Number(NumberLiteral(literal))


def __int(literal: str) -> Number:
    return Number(NumberLiteral(literal))


def __bool(boolean: bool) -> Bool:
    return Bool(BoolLiteral(boolean))


def __array[T: Type](*elements: T) -> Array[T]:
    return Array.of(*elements)


# endregion

# region Boolean Operators


def __in(left: Any, right: Str | Array) -> Bool:
    return right.contains(left)


def __not_in(left: Any, right: Str | Array) -> Bool:
    return __in(left, right).__invert__()


def __eq(left: Primitive, right: Primitive) -> Bool:
    return left == right


def __ne(left: Primitive, right: Primitive) -> Bool:
    return left != right


def __lt(left: Primitive, right: Primitive) -> Bool:
    return left < right


def __le(left: Primitive, right: Primitive) -> Bool:
    return left <= right


def __gt(left: Primitive, right: Primitive) -> Bool:
    return left > right


def __ge(left: Primitive, right: Primitive) -> Bool:
    return left >= right


# endregion

# region Function Wrapping


def __lambda(func: FunctionProtocol) -> XLUntypedLambda:
    return XLUntypedLambda(func)


def __nested_function(func: FunctionProtocol) -> XLTypedLambda:
    return XLTypedLambda(func)


# endregion
