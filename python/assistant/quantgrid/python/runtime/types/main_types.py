import enum
import functools

from types import NotImplementedType
from typing import Any, Callable, Self, cast, get_args, get_origin, overload

from quantgrid.python.exceptions import XLCompileError, XLPythonError
from quantgrid.python.runtime.nodes import (
    BinaryOperator,
    FieldReference,
    GlobalFunction,
    IfBlock,
    ListCreation,
    MemberFunction,
    NumberLiteral,
    SpacedUnaryOperator,
    StrLiteral,
    TableReference,
    UnaryOperator,
    XLNode,
)
from quantgrid.python.runtime.protocols import FieldProtocol, TableProtocol
from quantgrid.python.runtime.types.base_type import Type
from quantgrid.python.runtime.types.wildcard_type import Wildcard
from quantgrid.python.runtime.types.xl_lambda import XLLambda
from quantgrid.python.runtime.types.xl_typed_lambda import XLTypedLambda
from quantgrid.python.template import Template, TypeVariable

TableType = TypeVariable("T")
ElementType = TypeVariable("E")
PivotType = TypeVariable("P")


class Primitive(Type):
    # region Conversion Functions

    def as_string(self) -> "Str":
        if isinstance(self, Str):
            return self

        return Str(MemberFunction(self.node, "TEXT"))

    def as_number(self) -> "Number":
        if isinstance(self, Number):
            return self

        return Number(MemberFunction(self.node, "VALUE"))

    # endregion

    # region Comparison Operators

    def __eq__(self, other):
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, "=", other.node))

    def __lt__(self, other: "Primitive") -> "Bool":
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, "<", other.node))

    def __le__(self, other: "Primitive") -> "Bool":
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, "<=", other.node))

    def __ne__(self, other):
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, "<>", other.node))

    def __ge__(self, other: "Primitive") -> "Bool":
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, ">=", other.node))

    def __gt__(self, other: "Primitive") -> "Bool":
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, ">", other.node))

    # endregion

    # region Logic Operators

    def __and__(self, other: "Primitive") -> "Bool":
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, "AND", other.node))

    def __or__(self, other: "Primitive") -> "Bool":
        if not isinstance(other, Primitive):
            return NotImplemented

        return Bool(BinaryOperator(self.node, "OR", other.node))

    def __invert__(self) -> "Bool":
        return Bool(SpacedUnaryOperator("NOT", self.node))

    # endregion

    @classmethod
    def common_with(cls, other: type["Type"]) -> type["Type"] | NotImplementedType:
        if issubclass(cls, other):
            return other

        if issubclass(other, cls):
            return cls

        return NotImplemented


# TODO[LLM Clean Code][Generation Quality]: Support compile-time arithmetic between two NumberLiterals
class Number(Primitive):
    def __init__(self, origin: XLNode | str):
        super().__init__(
            origin if isinstance(origin, XLNode) else NumberLiteral(origin)
        )

    # region Arithmetic Operators

    def __pos__(self) -> "Number":
        return self

    def __neg__(self) -> "Number":
        node = self.node
        if isinstance(node, NumberLiteral):
            return Number(
                NumberLiteral("-" + node.code) if not node.is_negative else node.abs()
            )

        return Number(UnaryOperator("-", self.node))

    def __add__(self, other: "Number") -> "Number":
        if not isinstance(other, Number):
            return NotImplemented

        return Number(BinaryOperator(self.node, "+", other.node))

    def __sub__(self, other: "Number") -> "Number":
        if not isinstance(other, Number):
            return NotImplemented

        return Number(BinaryOperator(self.node, "-", other.node))

    def __mul__(self, other: "Number") -> "Number":
        if not isinstance(other, Number):
            return NotImplemented

        return Number(BinaryOperator(self.node, "*", other.node))

    def __truediv__(self, other: "Number") -> "Number":
        if not isinstance(other, Number):
            return NotImplemented

        return Number(BinaryOperator(self.node, "/", other.node))

    def __mod__(self, other: "Number") -> "Number":
        if not isinstance(other, Number):
            return NotImplemented

        return Number(BinaryOperator(self.node, "MOD", other.node))

    def __pow__(self, power: "Number") -> "Number":
        if not isinstance(power, Number):
            return NotImplemented

        return Number(BinaryOperator(self.node, "^", power.node))

    # endregion

    # region Math Functions

    def abs(self) -> "Number":
        node = self.node
        if isinstance(node, NumberLiteral):
            return Number(node.abs())

        return Number(MemberFunction(self.node, "ABS"))

    def sqrt(self) -> "Number":
        return Number(MemberFunction(self.node, "SQRT"))

    def round(self) -> "Number":
        return Number(MemberFunction(self.node, "ROUND"))

    def floor(self) -> "Number":
        return Number(MemberFunction(self.node, "FLOOR"))

    def ceil(self) -> "Number":
        return Number(MemberFunction(self.node, "CEIL"))

    def exp(self) -> "Number":
        return Number(MemberFunction(self.node, "EXP"))

    def log(self, base: "Number") -> "Number":
        return Number(MemberFunction(self.node, "LOG", base.node))

    def ln(self) -> "Number":
        return Number(MemberFunction(self.node, "LN"))

    def log10(self) -> "Number":
        return Number(MemberFunction(self.node, "LOG10"))

    def sin(self) -> "Number":
        return Number(MemberFunction(self.node, "SIN"))

    def cos(self) -> "Number":
        return Number(MemberFunction(self.node, "COS"))

    def tan(self) -> "Number":
        return Number(MemberFunction(self.node, "TAN"))

    def asin(self) -> "Number":
        return Number(MemberFunction(self.node, "ASIN"))

    def acos(self) -> "Number":
        return Number(MemberFunction(self.node, "ACOS"))

    def atan(self) -> "Number":
        return Number(MemberFunction(self.node, "ATAN"))

    # endregion


class Str(Primitive):
    @property
    def len(self) -> "Number":
        return Number(MemberFunction(self.node, "LEN"))

    # region String Manipulation

    def lower(self) -> "Str":
        return Str(MemberFunction(self.node, "LOWER"))

    def upper(self) -> "Str":
        return Str(MemberFunction(self.node, "UPPER"))

    def trim(self) -> "Str":
        return Str(MemberFunction(self.node, "TRIM"))

    def strip(self, substring: "Str") -> "Str":
        return Str(MemberFunction(self.node, "STRIP", substring.node))

    def strip_prefix(self, substring: "Str") -> "Str":
        return Str(MemberFunction(self.node, "STRIP_START", substring.node))

    def strip_postfix(self, substring: "Str") -> "Str":
        return Str(MemberFunction(self.node, "STRIP_END", substring.node))

    def replace(self, old: "Str", new: "Str") -> "Str":
        return Str(MemberFunction(self.node, "SUBSTITUTE", old.node, new.node))

    def split(self, delimiter: "Str") -> "Array[Str]":
        return Array.of_type(Str)(MemberFunction(self.node, "SPLIT", delimiter.node))

    # endregion

    # region Substring Check

    def contains(self, item: "Str") -> "Bool":
        return Bool(MemberFunction(self.node, "CONTAINS", item.node))

    # endregion

    # region String Arithmetic

    def __add__(self, other: "Str") -> "Str":
        if not isinstance(other, Str):
            return NotImplemented

        return Str(BinaryOperator(self.node, "&", other.node))

    # endregion

    # region String Indexing and Slicing

    def __getitem__(self, item: Number | slice) -> "Str":
        return (
            self._on_index(item) if isinstance(item, Number) else self._on_slice(item)
        )

    # endregion

    # region Private Functions

    def _on_index(self, index: Number) -> "Str":
        node = index.node
        if isinstance(node, NumberLiteral) and node.is_zero:
            return Str(MemberFunction(self.node, "LEFT", Number("1").node))

        if isinstance(node, NumberLiteral) and node.is_equal("-1"):
            return Str(MemberFunction(self.node, "RIGHT", Number("1").node))

        return Str(
            MemberFunction(
                self.node,
                "MID",
                (
                    _normalize_index(index, self.len, IndexingType.INDEX) + Number("1")
                ).node,
                Number("1").node,
            )
        )

    def _on_slice(self, slicing: slice) -> "Str":
        slice_start: Number | None = slicing.start
        slice_stop: Number | None = slicing.stop

        if slice_start is None and slice_stop is None:
            return self

        if slice_stop is None:
            return Str(
                MemberFunction(
                    self.node,
                    "RIGHT",
                    _normalize_index(
                        cast(Number, slice_start), self.len, IndexingType.RIGHT_SLICE
                    ).node,
                )
            )

        if slice_start is None:
            return Str(
                MemberFunction(
                    self.node,
                    "LEFT",
                    _normalize_index(
                        cast(Number, slice_stop), self.len, IndexingType.LEFT_SLICE
                    ).node,
                )
            )

        norm_start = _normalize_index(slice_start, self.len, IndexingType.INDEX)
        norm_stop = _normalize_index(slice_stop, self.len, IndexingType.INDEX)
        length = norm_stop - norm_start

        return Str(
            MemberFunction(
                self.node, "MID", (norm_start + Number("1")).node, length.node
            )
        )

    # endregion


class Bool(Primitive): ...


class Date(Primitive):
    @staticmethod
    def construct(year: Number, month: Number, day: Number) -> "Date":
        return Date(GlobalFunction("DATE", year.node, month.node, day.node))

    # region Date Properties

    @property
    def day(self) -> Number:
        return Number(MemberFunction(self.node, "DAY"))

    @property
    def month(self) -> Number:
        return Number(MemberFunction(self.node, "MONTH"))

    @property
    def year(self) -> Number:
        return Number(MemberFunction(self.node, "YEAR"))

    # endregion

    # region Date Arithmetic

    def __add__(self, days: Number) -> "Date":
        if not isinstance(days, Number):
            return NotImplemented

        return Date(BinaryOperator(self.node, "+", days.node))

    def __sub__(self, days: Number) -> "Date":
        if not isinstance(days, Number):
            return NotImplemented

        return Date(BinaryOperator(self.node, "-", days.node))

    # endregion


class RowRef[T: TableProtocol](Type, Template.create(TableType)):  # type: ignore[misc]
    def __getattr__(self, field_name: str) -> Type:
        if (table := self.table_type()) is None:
            raise XLCompileError(
                f'Cannot access field "{field_name}" on unspecialized RowRef[T].'
            )

        if (field := table.get_fields().get(field_name, None)) is None:
            raise XLCompileError(
                f'{table.var_name} does not contain "{field_name}" field.'
            )

        if issubclass(field.value_type, Pivot):
            return field.value_type(self.node)

        return cast(type[Type], field.value_type)(
            FieldReference(self.node, field.ui_name)
        )

    # region Internal Utility

    @staticmethod
    def of_type(table_type: T) -> type["RowRef[T]"]:
        return RowRef.parametrize({TableType: table_type})

    @classmethod
    def table_type(cls) -> T:
        return cast(T, cls.parameter(TableType))

    @classmethod
    def from_annotation(cls, *arguments: type) -> type[Self]:
        if len(arguments) != 1 or not isinstance(
            table_type := get_origin(arguments[0]) or arguments[0], TableProtocol
        ):
            raise XLPythonError(
                f"{cls} type generic expected 1 table-like type variable, but got {len(arguments)}: {arguments}."
            )

        return RowRef[TableProtocol].of_type(table_type)

    @classmethod
    def common_with(cls, other: type[Type]) -> type["RowRef[T]"] | NotImplementedType:
        if not issubclass(other, RowRef):
            return NotImplemented

        if cls.table_type() is not other.table_type():
            return NotImplemented

        return RowRef.of_type(cls.table_type())

    # endregion


# TODO[Optimization][Code Quality]: Support compile-time array length tracking to optimize len() operations on slicing.
class Array[E: Type](Type, Template.create(ElementType), wildcard=Wildcard):  # type: ignore[misc]
    def __getattr__(self, item: str) -> Any:
        element = self.element_type()(self.node)
        if not hasattr(element, item):
            raise AttributeError(f"{type(self)} has no attribute '{item}'.")

        attr = getattr(element, item)
        if isinstance(attr, Type):
            return Array.of_type(type(attr))(attr.node)
        elif callable(attr):
            return ArrayPerElementProxy(cast(Callable, attr))

        raise AttributeError(f"{type(self)} has no attribute '{item}'.")

    @property
    def len(self) -> Number:
        return Number(MemberFunction(self.node, "COUNT"))

    @property
    def field_names(self: "Array[RowRef]") -> "Array[Str]":
        row_ref = self.restrict_element_type(RowRef, "field_names")
        return Array.of_type(Str)(
            MemberFunction(TableReference(row_ref.table_type().ui_name), "FIELDS")
        )

    # region Construction

    @staticmethod
    def from_range(first_number: Number, last_number: Number) -> "Array[Number]":
        interval = Number("1") + last_number - first_number
        offset = first_number - Number("1")

        if isinstance(offset, NumberLiteral) and offset.is_zero:
            return Array.of_type(Number)(GlobalFunction("RANGE", interval.node))

        return Array.of_type(Number)(
            (offset + Number(GlobalFunction("RANGE", interval.node))).node
        )

    @staticmethod
    def from_date_range(
        first_date: Date, last_date: Date, day_step: Number
    ) -> "Array[Date]":
        return Array.of_type(Date)(
            GlobalFunction("DATERANGE", first_date.node, last_date.node, day_step.node)
        )

    @staticmethod
    def from_table[T: TableProtocol](table: T) -> "Array[RowRef[T]]":
        return Array.of_type(RowRef.of_type(table))(TableReference(table.ui_name))

    @staticmethod
    def from_field[T: Type](field: FieldProtocol[T]) -> "Array[T]":
        if not isinstance(field, FieldProtocol):
            raise XLCompileError(
                f"Expected field-like object, but received {type(field).__name__} instead."
            )

        return Array.of_type(field.value_type)(
            FieldReference(TableReference(field.owner.ui_name), field.ui_name)
        )

    # endregion

    # region Indexing and Slicing

    @overload
    def __getitem__(self: "Array[E]", index: Number) -> E: ...

    @overload
    def __getitem__(self: "Array[E]", index: slice) -> "Array[E]": ...

    def __getitem__(self, index):
        row_index: Number | slice = index if not isinstance(index, tuple) else index[0]

        return (
            self._index_by_slice(row_index)
            if isinstance(row_index, slice)
            else self._index_by_item(row_index)
        )

    def slice_field[
        T: Type
    ](self: "Array[RowRef]", field: FieldProtocol[T]) -> "Array[T]":
        row_ref = self.restrict_element_type(RowRef, "slice_field")

        if row_ref.table_type() is not field.owner:
            raise XLCompileError(
                f"Cannot extract field {field.var_name} from {type(self)}, "
                f"as array holds {row_ref}, but requested field belongs to table {field.owner.var_name}."
            )

        return Array.of_type(field.value_type)(FieldReference(self.node, field.ui_name))

    # endregion

    # region Array Transformers

    # TODO[Clean Code][Decorator]: @compute_node signature validation decorator.
    #  @compile_code already checks annotations and actual returned type for compatibility,
    #  but actual specific per-function types yet needs to be checked (using decorator to avoid boilerplate).
    def filter(self, xl_lambda: XLLambda[Bool]) -> "Array[E]":
        node_type = self.restrict_lambda_parameter(xl_lambda, 0, "filter")
        self.restrict_lambda_return(xl_lambda, Primitive, "filter")

        filter_lambda = xl_lambda(node_type(self.node))
        return Array.of_type(self.element_type())(
            MemberFunction(self.node, "FILTER", filter_lambda.node)
        )

    def sort_rows_by(self, *xl_lambdas: XLLambda[Primitive]) -> "Array[E]":
        sort_lambdas: list[Type] = []
        for xl_lambda in xl_lambdas:
            node_type = self.restrict_lambda_parameter(xl_lambda, 0, "sort_by")
            self.restrict_lambda_return(xl_lambda, Primitive, "sort_by")
            sort_lambdas.append(xl_lambda(node_type(self.node)))

        return Array.of_type(self.element_type())(
            MemberFunction(
                self.node, "SORTBY", *(sort_lambda.node for sort_lambda in sort_lambdas)
            )
        )

    def sort_primitives[P: Primitive](self: "Array[P]") -> "Array[P]":
        self.restrict_element_type(Primitive, "sort_primitives")
        return Array.of_type(self.element_type())(MemberFunction(self.node, "SORT"))

    def unique_rows_by(self, *xl_lambdas: XLLambda[Primitive]) -> "Array[E]":
        unique_lambdas: list[Type] = []
        for xl_lambda in xl_lambdas:
            node_type = self.restrict_lambda_parameter(xl_lambda, 0, "unique_rows_by")
            self.restrict_lambda_return(xl_lambda, Primitive, "unique_rows_by")
            unique_lambdas.append(xl_lambda(node_type(self.node)))

        return Array.of_type(self.element_type())(
            MemberFunction(
                self.node,
                "UNIQUEBY",
                *(sort_lambda.node for sort_lambda in unique_lambdas),
            )
        )

    def unique_primitives[P: Primitive](self: "Array[P]") -> "Array[P]":
        self.restrict_element_type(Primitive, "unique_primitives")
        return Array.of_type(self.element_type())(MemberFunction(self.node, "UNIQUE"))

    # endregion
    # region Pivot / Unpivot

    def pivot[
        T: Type
    ](
        self: "Array[RowRef]", fields: XLLambda[Primitive], aggregation: XLLambda[T]
    ) -> "Pivot[T]":
        self.restrict_element_type(RowRef, "pivot")

        self.restrict_lambda_parameter(fields, 0, "pivot")
        self.restrict_lambda_return(fields, Primitive, "pivot")

        aggregation_type = self.restrict_lambda_return(aggregation, Type, "pivot")
        if not issubclass(type(self), aggregation.parameter_type(0)):
            raise XLCompileError(
                f'Pivot "aggregations" parameter type mismatch. '
                f"Expected: {type(self)}, actual: {aggregation.parameter_type(0)}."
            )

        return Pivot.of_type(aggregation_type)(
            MemberFunction(
                self.node,
                "PIVOT",
                fields(self.element_type()(self.node)).node,
                aggregation(type(self)(self.node)).node,
            )
        )

    def unpivot(
        self: "Array[RowRef]",
        name_field: FieldProtocol,
        value_field: FieldProtocol,
        ui_name_filter: XLLambda | None = None,
    ) -> "Array[RowRef]":
        if ui_name_filter is not None:
            self.restrict_element_type(RowRef, "unpivot")
            Array.of_type(Str).restrict_lambda_parameter(ui_name_filter, 0, "unpivot")
            self.restrict_lambda_return(ui_name_filter, Bool, "unpivot")

        if name_field.owner is not value_field.owner:
            raise XLCompileError(
                f"Unpivot function expected two static fields belonging to the same table, but "
                f"{name_field.var_name} belongs to {name_field.owner.var_name}, and "
                f"{value_field.var_name} belongs to {value_field.owner.var_name}."
            )

        return Array.of_type(RowRef.of_type(name_field.owner))(
            MemberFunction(
                self.node,
                "UNPIVOT",
                StrLiteral(name_field.ui_name),
                StrLiteral(value_field.ui_name),
                *(
                    (ui_name_filter(Str(self.node)).node,)
                    if ui_name_filter is not None
                    else ()
                ),
            )
        )

    # endregion
    # region Array[Primitive] Aggregations

    # TODO[Functions][Code Generation]: Support max_by / min_by
    def min[P: Primitive](self: "Array[P]") -> P:
        element = self.restrict_element_type(Primitive, "min")
        return element(MemberFunction(self.node, "MIN"))

    def max[P: Primitive](self: "Array[P]") -> P:
        element = self.restrict_element_type(Primitive, "max")
        return element(MemberFunction(self.node, "MAX"))

    def mode[P: Primitive](self: "Array[P]") -> P:
        element = self.restrict_element_type(Primitive, "mode")
        return element(MemberFunction(self.node, "MODE"))

    # endregion

    # region Array[Primitive] Scalar Comparison Operators

    def __eq__(self: "Array[Primitive]", other):
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__eq__")
        return Array.of_type(Bool)(BinaryOperator(self.node, "=", other.node))

    def __ne__(self: "Array[Primitive]", other):
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__ne__")
        return Array.of_type(Bool)(BinaryOperator(self.node, "<>", other.node))

    def __lt__(self: "Array[Primitive]", other: "Primitive") -> "Array[Bool]":
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__lt__")
        return Array.of_type(Bool)(BinaryOperator(self.node, "<", other.node))

    def __le__(self: "Array[Primitive]", other: "Primitive") -> "Array[Bool]":
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__le__")
        return Array.of_type(Bool)(BinaryOperator(self.node, "<=", other.node))

    def __ge__(self: "Array[Primitive]", other: "Primitive") -> "Array[Bool]":
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__ge__")
        return Array.of_type(Bool)(BinaryOperator(self.node, ">=", other.node))

    def __gt__(self: "Array[Primitive]", other: "Primitive") -> "Array[Bool]":
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__gt__")
        return Array.of_type(Bool)(BinaryOperator(self.node, ">", other.node))

    # endregion

    # region Array[Primitive] Scalar Logic Operators

    def __and__(self: "Array[Primitive]", other: "Primitive") -> "Array[Bool]":
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__and__")
        return Array.of_type(Bool)(BinaryOperator(self.node, "AND", other.node))

    def __or__(self: "Array[Primitive]", other: "Primitive") -> "Array[Bool]":
        if not isinstance(other, Primitive):
            return NotImplemented

        self.restrict_element_type(Primitive, "__or__")
        return Array.of_type(Bool)(BinaryOperator(self.node, "OR", other.node))

    def __invert__(self: "Array[Primitive]") -> "Array[Bool]":
        self.restrict_element_type(Primitive, "__invert__")
        return Array.of_type(Bool)(SpacedUnaryOperator("NOT", self.node))

    # endregion

    # region Array[Primitive] Item Check

    def contains(self: "Array[Primitive]", item: Primitive) -> Bool:
        self.restrict_element_type(Primitive, "contains")
        return Bool(GlobalFunction("IN", item.node, self.node))

    # endregion

    # region Array[Number] Aggregations

    def sum(self: "Array[Number]") -> Number:
        element = self.restrict_element_type(Number, "sum")
        return element(MemberFunction(self.node, "SUM"))

    def mean(self: "Array[Number]") -> Number:
        element = self.restrict_element_type(Number, "mean")
        return element(MemberFunction(self.node, "AVERAGE"))

    def geo_mean(self: "Array[Number]") -> Number:
        element = self.restrict_element_type(Number, "geo_mean")
        return element(MemberFunction(self.node, "GEOMEAN"))

    def std_sample(self: "Array[Number]") -> Number:
        element = self.restrict_element_type(Number, "std_sample")
        return element(MemberFunction(self.node, "STDEVS"))

    def std_population(self: "Array[Number]") -> Number:
        element = self.restrict_element_type(Number, "std_population")
        return element(MemberFunction(self.node, "STDEVP"))

    # endregion

    # region Array[Number] Scalar Arithmetic

    def __pos__(self: "Array[Number]") -> "Array[Number]":
        self.restrict_element_type(Number, "Unary Plus")
        return self

    def __neg__(self: "Array[Number]") -> "Array[Number]":
        element = self.restrict_element_type(Number, "Negation")
        return Array.of_type(element)(UnaryOperator("-", self.node))

    def __add__(self: "Array[Number]", other: "Number") -> "Array[Number]":
        if not isinstance(other, Number):
            return NotImplemented

        element = self.restrict_element_type(Number, "__add__")
        return Array.of_type(element)(BinaryOperator(self.node, "+", other.node))

    def __sub__(self: "Array[Number]", other: "Number") -> "Array[Number]":
        if not isinstance(other, Number):
            return NotImplemented

        element = self.restrict_element_type(Number, "__sub__")
        return Array.of_type(element)(BinaryOperator(self.node, "-", other.node))

    def __mul__(self: "Array[Number]", other: "Number") -> "Array[Number]":
        if not isinstance(other, Number):
            return NotImplemented

        element = self.restrict_element_type(Number, "__mul__")
        return Array.of_type(element)(BinaryOperator(self.node, "*", other.node))

    def __truediv__(self: "Array[Number]", other: "Number") -> "Array[Number]":
        if not isinstance(other, Number):
            return NotImplemented

        element = self.restrict_element_type(Number, "__truediv__")
        return Array.of_type(element)(BinaryOperator(self.node, "/", other.node))

    def __mod__(self: "Array[Number]", other: "Number") -> "Array[Number]":
        if not isinstance(other, Number):
            return NotImplemented

        element = self.restrict_element_type(Number, "__mod__")
        return Array.of_type(element)(BinaryOperator(self.node, "MOD", other.node))

    def __pow__(self: "Array[Number]", power: Number) -> "Array[Number]":
        element = self.restrict_element_type(Number, "Power")
        return Array.of_type(element)(BinaryOperator(self.node, "^", power.node))

    # endregion

    # region Internal Utility

    @staticmethod
    def of(*elements: E) -> "Array[E]":
        if not len(elements):
            return Array.of_type(Wildcard)(ListCreation())

        element_types = [type(elem) for elem in elements]
        common_type = Type.common_type_of(*element_types)
        if common_type is None:
            raise XLCompileError(
                f"Element type incompatibility on array explicit creation: {element_types}."
            )

        return Array.of_type(common_type)(
            ListCreation(*(element.node for element in elements))
        )

    @staticmethod
    def of_type(element_type: type[Type] | None) -> type["Array[E]"]:
        return Array.parametrize({ElementType: element_type or Wildcard})

    @classmethod
    def restrict_element_type(
        cls, element_bound: type[Type], function_name: str
    ) -> type[E]:
        if not issubclass(cls, Array.of_type(element_bound)):
            raise XLCompileError(
                f"Function {function_name} expected at least {element_bound} element type, but was applied to {cls}."
            )

        return cls.element_type()

    # TODO[Type Safety][Compilation]: Actually, we don't know what to do when [].filter(lambda x: x > 10) is called.
    #  In such case, both sides have no type information. Array[Empty] and lambda does not define expected type.
    #  Good news, such expr is obscure and meaningless, but nevertheless it is potential type system flaw.
    @classmethod
    def restrict_lambda_parameter(
        cls,
        xl_lambda: XLLambda,
        parameter_index: int,
        function_name: str,
    ) -> type[Type]:
        parameter_type = (
            xl_lambda.parameter_type(parameter_index)
            if isinstance(xl_lambda, XLTypedLambda)
            else cls.element_type()
        )

        if not issubclass(cls, Array.of_type(parameter_type)):
            raise XLCompileError(
                f"Function {xl_lambda.function.__name__} parameter #{parameter_index} "
                f"was expected to be at least {parameter_type}, "
                f"but was applied to {cls} elements in {function_name}."
            )

        return parameter_type

    @staticmethod
    def restrict_lambda_return[
        T: Type
    ](xl_lambda: XLLambda, expected_type: type[T], function_name: str) -> type[T]:
        if not isinstance(xl_lambda, XLTypedLambda):
            return expected_type

        return_type = xl_lambda.return_type()
        if not issubclass(return_type, expected_type):
            raise XLCompileError(
                f"{function_name} expected {xl_lambda.function.__name__} to return at least {expected_type}, "
                f"but {xl_lambda.function.__name__} is annotated to return {return_type}."
            )

        return return_type

    @classmethod
    def element_type(cls) -> type[E]:
        return cast(type[E], cls.parameter(ElementType))

    @classmethod
    def from_annotation(cls, *arguments: type) -> type[Self]:
        if len(arguments) != 1 or not issubclass(
            element_origin := get_origin(arguments[0]) or arguments[0], Type
        ):
            raise XLPythonError(
                f"{cls} type generic expected 1 parameter of type {Type}, but got {len(arguments)}: {arguments}."
            )

        return Array.of_type(
            cast(type[Type], element_origin).from_annotation(*get_args(arguments[0]))
        )

    @classmethod
    def common_with(cls, other: type[Type]) -> type["Array[Type]"] | NotImplementedType:
        if not issubclass(other, Array):
            return NotImplemented

        cls_element = cls.element_type()
        other_element = other.element_type()

        common_element = Type.common_type(cls_element, other_element)
        return (
            NotImplemented if common_element is None else Array.of_type(common_element)
        )

    # endregion

    # region Private Functions

    def _index_by_item(self, item: Number) -> E:
        cls_element = self.element_type()
        if cls_element is Wildcard:
            raise XLCompileError("Cannot index an empty array.")

        return cls_element(
            MemberFunction(
                self.node,
                "INDEX",
                (
                    _normalize_index(item, self.len, IndexingType.INDEX) + Number("1")
                ).node,
            )
        )

    def _index_by_slice(self, slicing: slice) -> "Array[E]":
        slice_start: Number | None = slicing.start
        slice_stop: Number | None = slicing.stop

        if slice_start is None and slice_stop is None:
            return self

        if slice_stop is None:
            return self._last(
                _normalize_index(
                    cast(Number, slice_start), self.len, IndexingType.RIGHT_SLICE
                )
            )

        if slice_start is None:
            return self._first(
                _normalize_index(
                    cast(Number, slice_stop), self.len, IndexingType.LEFT_SLICE
                )
            )

        norm_stop = _normalize_index(slice_stop, self.len, IndexingType.LEFT_SLICE)

        start_node = slice_start.node
        if isinstance(start_node, NumberLiteral):
            return (
                self._last(slice_start.abs())._first(norm_stop)
                if start_node.is_negative
                else self._last(self.len - slice_start)._first(norm_stop - slice_start)
            )

        return Array.of_type(self.element_type())(
            IfBlock(
                (slice_start < Number("0")).node,
                self._last(-slice_start)._first(norm_stop).node,
                self._last(self.len - slice_start)._first(norm_stop - slice_start).node,
            )
        )

    def _first(self, number: Number) -> "Array[E]":
        return Array.of_type(self.element_type())(
            MemberFunction(self.node, "FIRST", number.node)
        )

    def _last(self, number: Number) -> "Array[E]":
        return Array.of_type(self.element_type())(
            MemberFunction(self.node, "LAST", number.node)
        )

    # endregion


class ArrayPerElementProxy[**P, T: Type]:
    def __init__(self, func: Callable[P, T]):
        functools.update_wrapper(self, func)
        self.__func = func

    def __call__(self, *args: P.args, **kwargs: P.kwargs) -> Array[T]:
        element_function = self.__func(*args, **kwargs)
        return Array.of_type(type(element_function))(element_function.node)


class Pivot[T: Type](Type, Template.create(PivotType)):  # type: ignore[misc]
    def __getitem__(self, field_name: Str) -> T:
        literal = field_name.node
        if not isinstance(literal, StrLiteral):
            raise XLCompileError(
                "Pivot field supports indexing by string constant literal only."
            )

        return self.pivot_type()(FieldReference(self.node, literal.string))

    # region Internal Utility

    @classmethod
    def pivot_type(cls) -> type[T]:
        return cast(type[T], cls.parameter(PivotType))

    @staticmethod
    def of_type(element_type: type[T]) -> type["Pivot[T]"]:
        return Pivot.parametrize({PivotType: element_type})

    @classmethod
    def from_annotation(cls, *arguments: type) -> type[Self]:
        if len(arguments) != 1 or not issubclass(
            element_origin := get_origin(arguments[0]) or arguments[0], Type
        ):
            raise XLPythonError(
                f"{cls} type generic expected 1 parameter of type {Type}, but got {len(arguments)}: {arguments}."
            )

        return Pivot.of_type(
            cast(type[T], element_origin).from_annotation(*get_args(arguments[0]))
        )

    # endregion


class IndexingType(enum.StrEnum):
    LEFT_SLICE = "left"
    INDEX = "index"
    RIGHT_SLICE = "right"


# TODO[Bug][Reproduce]: Two-sided slicing is fully broken.
def _normalize_index(
    index: Number, length: Number, indexing_type: IndexingType
) -> Number:
    node = index.node
    if isinstance(node, NumberLiteral):
        if indexing_type in (IndexingType.LEFT_SLICE, IndexingType.INDEX):
            return length - index.abs() if node.is_negative else index
        else:
            return index.abs() if node.is_negative else length - index

    if indexing_type in (IndexingType.LEFT_SLICE, IndexingType.INDEX):
        return Number(
            IfBlock((index >= Number("0")).node, index.node, (length + index).node)
        )
    else:
        return Number(
            IfBlock((index < Number("0")).node, index.abs().node, (length - index).node)
        )
