from typing import Self, cast

from quantgrid.configuration import LOGGER
from quantgrid.python.xl.context import NestedFunction
from quantgrid.python.xl.exceptions import NameNotFoundError
from quantgrid.python.xl.types.base import Type
from quantgrid.python.xl.types.decorators import (
    binary_operator,
    member_function,
    static_function,
    unary_operator,
)
from quantgrid.python.xl.types.unresolved import Unresolved
from quantgrid.utils.string import pythonize, unquote_forced


class Primitive(Type):
    def common_with(self, other: "Type") -> "Type":
        if isinstance(self, type(other)):
            return other.dummy()

        if isinstance(other, type(self)):
            return self.dummy()

        return NotImplemented

    @member_function("TEXT")
    def as_string(self) -> "Str":
        return Str(f"{self.code}.as_string()")

    @member_function("VALUE")
    def as_number(self) -> "Number":
        return Number(f"{self.code}.as_number()")

    # Comparison Operators

    @binary_operator("=")
    def eq(self, other: "Primitive | Array[Primitive]") -> "Bool | Array[Bool]":
        if isinstance(other, Array):
            return Array(Bool())
        if isinstance(other, Primitive):
            return Bool(f"{self.code} == {other.code}")
        else:
            return Array(Bool(), f"{self.code} == {other.code}")

    @binary_operator("<>")
    def ne(self, other: "Primitive | Array[Primitive]") -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} != {other.code}")
        else:
            return Array(Bool(), f"{self.code} != {other.code}")

    @binary_operator("<")
    def lt(self, other: "Primitive | Array[Primitive]") -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} < {other.code}")
        else:
            return Array(Bool(), f"{self.code} < {other.code}")

    @binary_operator("<=")
    def le(self, other: "Primitive | Array[Primitive]") -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} <= {other.code}")
        else:
            return Array(Bool(), f"{self.code} <= {other.code}")

    @binary_operator(">=")
    def ge(self, other: "Primitive | Array[Primitive]") -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} >= {other.code}")
        else:
            return Array(Bool(), f"{self.code} >= {other.code}")

    @binary_operator(">")
    def gt(self, other: "Primitive | Array[Primitive]") -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} > {other.code}")
        else:
            return Array(Bool(), f"{self.code} > {other.code}")

    # Logic Operators

    @binary_operator("AND")
    def and_operator(
        self, other: "Primitive | Array[Primitive]"
    ) -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} and {other.code}")
        else:
            return Array(Bool(), f"{self.code} and {other.code}")

    @binary_operator("OR")
    def or_operator(
        self, other: "Primitive | Array[Primitive]"
    ) -> "Bool | Array[Bool]":
        if isinstance(other, Primitive):
            return Bool(f"{self.code} or {other.code}")
        else:
            return Array(Bool(), f"{self.code} or {other.code}")

    @unary_operator("NOT")
    def not_operator(self) -> "Bool":
        return Bool(f"not {self.code}")

    # Array[Primitive] Item Check

    @member_function("IN")
    def contains(self, item: "Array[Primitive]") -> "Bool":
        return Bool(f"{item.code}.contains({self.code})")


class Number(Primitive):
    @unary_operator("-")
    def neg(self) -> "Number":
        return Number(f"-{self.code}")

    @binary_operator("+")
    def add(self, other: "Number | Array[Number]") -> "Number | Array[Number]":
        if isinstance(other, Number):
            return Number(f"{self.code} + {other.code}")
        else:
            return Array(Number(), f"{self.code} + {other.code}")

    @binary_operator("-")
    def sub(self, other: "Number | Array[Number]") -> "Number | Array[Number]":
        if isinstance(other, Number):
            return Number(f"{self.code} - {other.code}")
        else:
            return Array(Number(), f"{self.code} - {other.code}")

    @binary_operator("*")
    def mul(self, other: "Number | Array[Number]") -> "Number | Array[Number]":
        if isinstance(other, Number):
            return Number(f"{self.code} * {other.code}")
        else:
            return Array(Number(), f"{self.code} * {other.code}")

    @binary_operator("/")
    def div(self, other: "Number | Array[Number]") -> "Number | Array[Number]":
        if isinstance(other, Number):
            return Number(f"{self.code} / {other.code}")
        else:
            return Array(Number(), f"{self.code} / {other.code}")

    @binary_operator("MOD")
    def mod(self, other: "Number | Array[Number]") -> "Number | Array[Number]":
        if isinstance(other, Number):
            return Number(f"{self.code} % {other.code}")
        else:
            return Array(Number(), f"{self.code} % {other.code}")

    @binary_operator("^")
    def pow(self, power: "Number | Array[Number]") -> "Number | Array[Number]":
        if isinstance(power, Number):
            return Number(f"{self.code} ^ {power.code}")
        else:
            return Array(Number(), f"{self.code} ^ {power.code}")

    # Math Functions

    @member_function("ABS")
    def abs(self) -> "Number":
        return Number(f"{self.code}.abs()")

    @member_function("SQRT")
    def sqrt(self) -> "Number":
        return Number(f"{self.code}.sqrt()")

    @member_function("ROUND")
    def round(self) -> "Number":
        return Number(f"{self.code}.round()")

    @member_function("FLOOR")
    def floor(self) -> "Number":
        return Number(f"{self.code}.floor()")

    @member_function("CEIL")
    def ceil(self) -> "Number":
        return Number(f"{self.code}.ceil()")

    @member_function("EXP")
    def exp(self) -> "Number":
        return Number(f"{self.code}.exp()")

    @member_function("LOG")
    def log(self, base: "Number") -> "Number":
        return Number(f"{self.code}.log({base.code})")

    @member_function("LN")
    def ln(self) -> "Number":
        return Number(f"{self.code}.ln()")

    @member_function("LOG10")
    def log10(self) -> "Number":
        return Number(f"{self.code}.log10()")

    @member_function("SIN")
    def sin(self) -> "Number":
        return Number(f"{self.code}.sin()")

    @member_function("COS")
    def cos(self) -> "Number":
        return Number(f"{self.code}.cos()")

    @member_function("TAN")
    def tan(self) -> "Number":
        return Number(f"{self.code}.tan()")

    @member_function("ASIN")
    def asin(self) -> "Number":
        return Number(f"{self.code}.asin()")

    @member_function("ACOS")
    def acos(self) -> "Number":
        return Number(f"{self.code}.acos()")

    @member_function("ATAN")
    def atan(self) -> "Number":
        return Number(f"{self.code}.atan()")


class Str(Primitive):
    @member_function("LEN")
    def len(self) -> "Number":
        return Number(f"{self.code}.len")

    # String Manipulation

    @member_function("LOWER")
    def lower(self) -> "Str":
        return Str(f"{self.code}.lower()")

    @member_function("UPPER")
    def upper(self) -> "Str":
        return Str(f"{self.code}.upper()")

    @member_function("TRIM")
    def trim(self) -> "Str":
        return Str(f"{self.code}.trim()")

    @member_function("STRIP")
    def strip(self, substring: "Str") -> "Str":
        return Str(f"{self.code}.strip({substring.code})")

    @member_function("STRIP_START")
    def strip_prefix(self, substring: "Str") -> "Str":
        return Str(f"{self.code}.strip_prefix({substring.code})")

    @member_function("STRIP_END")
    def strip_postfix(self, substring: "Str") -> "Str":
        return Str(f"{self.code}.strip_postfix({substring.code})")

    @member_function("SUBSTITUTE")
    def replace(self, old: "Str", new: "Str") -> "Str":
        return Str(f"{self.code}.replace({old.code}, {new.code})")

    @member_function("SPLIT")
    def split(self, delimiter: "Str") -> "Array[Str]":
        return Array(Str(), f"{self.code}.split({delimiter.code})")

    # Substring Check

    @member_function("CONTAINS")
    def contains(self, item: "Str") -> "Bool":
        return Bool(f"{self.code}.contains({item.code})")

    # String Arithmetic

    @binary_operator("&")
    def add(self, other: "Str") -> "Str":
        return Str(f"{self.code} + {other.code}")

    @member_function("CONCAT")
    def concat(self, other: "Str") -> "Str":
        return Str(f"({self.code} + {other.code})")

    @member_function("CONCATENATE")
    def concatenate(self, other: "Str") -> "Str":
        return Str(f"({self.code} + {other.code})")

    # String Indexing and Slicing

    @member_function("LEFT")
    def left(self, number: Number) -> "Str":
        return Str(f"{self.code}[:{number.code}]")

    @member_function("RIGHT")
    def right(self, number: Number) -> "Str":
        return Str(f"{self.code}[-({number.code}):]")

    @member_function("MID")
    def mid(self, start: Number, count: Number) -> "Str":
        return Str(f"{self.code}[{start.code} - 1: {start.code} + {count.code} - 1]")


class Bool(Primitive):
    pass


class Date(Primitive):
    @staticmethod
    @static_function("DATE")
    def construct(year: Number, month: Number, day: Number) -> "Date":
        return Date(f"Date.construct({year.code}, {month.code}, {day.code})")

    # Date Properties

    @member_function("DAY")
    def day(self) -> Number:
        return Number(f"{self.code}.day")

    @member_function("MONTH")
    def month(self) -> Number:
        return Number(f"{self.code}.month")

    @member_function("YEAR")
    def year(self) -> Number:
        return Number(f"{self.code}.year")

    # Date Arithmetic

    @binary_operator("+")
    def add(self, days: Number) -> "Date":
        return Date(f"{self.code} + {days.code}")

    @binary_operator("-")
    def sub(self, days: Number) -> "Date":
        return Date(f"{self.code} - {days.code}")


class RowRef(Type):
    @classmethod
    def dummy(cls) -> Self:
        return cls()

    def common_with(self, other: "Type") -> "Type":
        if isinstance(self, type(other)):
            return RowRef()

        if isinstance(other, type(self)):
            return RowRef()

        return NotImplemented


# TODO[Sanity][Code Magic]: We need to delete all self-written templating meta-magic from .runtime types as done in .xl.types here.
#  But this will make all isinstance() and issubclass() impossible. Maybe, current state is OK?
class Array[E: Type](Type):
    def __init__(self, element_type: E, code: str = ""):
        super().__init__(code)

        self._element_type = element_type

    def with_code(self, code: str) -> Self:
        return type(self)(self.element_type, code)

    @classmethod
    def dummy(cls) -> Self:
        return cls(cast(E, Unknown()))

    @property
    def type_annotation(self) -> str:
        return f"{type(self).__name__}[{self.element_type.type_annotation}]"

    def common_with(self, other: "Type") -> "Type":
        if not isinstance(other, Array):
            return NotImplemented

        cls_element = self.element_type
        other_element = other.element_type

        common_type = Type.common_type(cls_element, other_element)
        return Array(common_type) if common_type is not None else NotImplemented

    @property
    def element_type(self) -> E:
        return self._element_type

    @member_function("COUNT")
    def len(self) -> Number:
        return Number(f"{self.code}.len")

    @member_function("FIELDS")
    def field_names(self: "Array[RowRef]") -> "Array[Str]":
        return Array(Str(), f"{self.code}.field_names")

    # region Construction

    @staticmethod
    @static_function("RANGE")
    def from_range(bound: "Number") -> "Array[Number]":
        return Array(Number(), f"Array.from_range(1, {bound.code})")

    @staticmethod
    @static_function("DATERANGE")
    def from_date_range(
        first_date: Date, last_date: Date, day_step: Number = Number("1")
    ) -> "Array[Date]":
        return Array(
            Date(),
            f"Array.from_date_range({', '.join(arg.code for arg in (first_date, last_date, day_step))})",
        )

    @staticmethod
    @static_function("LIST")
    def from_explicit_list(*elements: Type) -> "Array":
        return Array(Unknown(), "[" + ", ".join(elem.code for elem in elements) + "]")

    # endregion
    # Array Indexing and Slicing

    @member_function("INDEX")
    def index(self, index: Number) -> Type:
        return self.element_type.with_code(f"{self.code}[{index.code} - 1]")

    @member_function("FIRST")
    def first(self, count: Number) -> Type:
        return self.element_type.with_code(f"{self.code}[:{count.code}]")

    @member_function("LAST")
    def last(self, count: Number) -> Type:
        return self.element_type.with_code(f"{self.code}[-({count.code}):]")

    # Array Transformers

    @member_function("FILTER")
    def filter(self, filter_condition: Unresolved) -> "Array[E]":
        with NestedFunction(
            "filter_node", "item", self.element_type, Bool.__name__
        ) as node:
            node.set_expression(filter_condition.code)

        return Array(self.element_type, f"{self.code}.filter({node.function_name})")

    @member_function("SORTBY")
    def sort_rows_by(self, *sort_orders: Unresolved) -> "Array[E]":
        lambdas_names: list[str] = []
        for sort_order in sort_orders:
            with NestedFunction(
                "sort_node", "value", self.element_type, Primitive.__name__
            ) as node:
                node.set_expression(sort_order.code)
                lambdas_names.append(node.function_name)

        return Array(
            self.element_type, f"{self.code}.sort_rows_by({", ".join(lambdas_names)})"
        )

    @member_function("SORT")
    def sort_primitives(self) -> "Array[E]":
        return Array(self.element_type, f"{self.code}.sort_primitives()")

    @member_function("UNIQUEBY")
    def unique_rows_by(self, *unique_by: Unresolved) -> "Array[E]":
        lambdas_names: list[str] = []
        for unique_node in unique_by:
            with NestedFunction(
                "unique_node", "item", self.element_type, Primitive.__name__
            ) as node:
                node.set_expression(unique_node.code)
                lambdas_names.append(node.function_name)

        return Array(
            self.element_type, f"{self.code}.unique_rows_by({", ".join(lambdas_names)})"
        )

    @member_function("UNIQUE")
    def unique_primitives(self) -> "Array[E]":
        return Array(self.element_type, f"{self.code}.unique_primitives()")

    # region PIVOT / UNPIVOT

    @member_function("PIVOT")
    def pivot(self, field_names: Unresolved, aggregation: Unresolved) -> "Unknown":
        with NestedFunction(
            "field_name", "ref", self.element_type, Primitive.__name__
        ) as name_node:
            name_node.set_expression(field_names.code)

        with NestedFunction(
            "aggregation", "group", Array(RowRef()), Type.__name__
        ) as aggregation_node:
            aggregation_node.set_expression(aggregation.code)

        return Unknown(
            f"{self.code}.pivot({name_node.function_name}, {aggregation_node.function_name})"
        )

    # TODO[Unpivot][Hybrid Table]: We can't know what table is un-pivoting, so we just paste short field names.
    @member_function("UNPIVOT")
    def unpivot(
        self, name: Str, value: Str, condition: Unresolved | None = None
    ) -> "Array[RowRef]":
        if condition is not None:
            with NestedFunction(
                "condition", "field_name", Str(), Bool.__name__
            ) as condition_node:
                condition_node.set_expression(condition.code)

            return Array(
                RowRef(),
                f"{self.code}.unpivot("
                f"{pythonize(unquote_forced(name.code))}, "
                f"{pythonize(unquote_forced(value.code))}, "
                f"{condition_node.function_name}"
                f")",
            )

        return Array(
            RowRef(),
            f"{self.code}.unpivot("
            f"{unquote_forced(name.code)}, "
            f"{unquote_forced(value.code)}"
            f")",
        )

    # Array[Primitive] Conversions

    @member_function("TEXT")
    def as_strings(self: "Array[Primitive]") -> "Array[Str]":
        return Array(Str(), f"{self.code}.as_strings()")

    @member_function("VALUE")
    def as_numbers(self: "Array[Primitive]") -> "Array[Number]":
        return Array(Number(), f"{self.code}.as_numbers()")

    # Array[Primitive] Aggregations

    @member_function("MIN")
    def min[P: Primitive](self: "Array[P]") -> P:
        return self.element_type.with_code(f"{self.code}.min()")

    @member_function("MAX")
    def max[P: Primitive](self: "Array[P]") -> P:
        return self.element_type.with_code(f"{self.code}.max()")

    @member_function("MODE")
    def mode[P: Primitive](self: "Array[P]") -> P:
        return self.element_type.with_code(f"{self.code}.mode()")

    # Array[Primitive] Scalar Comparison Operators

    @binary_operator("=")
    def eq(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} == {other.code}")

    @binary_operator("<>")
    def ne(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} != {other.code}")

    @binary_operator("<")
    def lt(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} < {other.code}")

    @binary_operator("<=")
    def le(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} <= {other.code}")

    @binary_operator(">=")
    def ge(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} >= {other.code}")

    @binary_operator(">")
    def gt(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} > {other.code}")

    # Array[Primitive] Scalar Logic Operators

    @binary_operator("AND")
    def and_operator(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} and {other.code}")

    @binary_operator("OR")
    def or_operator(self: "Array[Primitive]", other: Primitive) -> "Array[Bool]":
        return Array(Bool(), f"{self.code} or {other.code}")

    @unary_operator("NOT")
    def invert_operator(self: "Array[Primitive]") -> "Array[Bool]":
        return Array(Bool(), f"not {self.code}")

    # Array[Number] Aggregations

    @member_function("SUM")
    def sum(self: "Array[Number]") -> Number:
        return self.element_type.with_code(f"{self.code}.sum()")

    @member_function("AVERAGE")
    def mean(self: "Array[Number]") -> Number:
        return self.element_type.with_code(f"{self.code}.mean()")

    @member_function("GEOMEAN")
    def geo_mean(self: "Array[Number]") -> Number:
        return self.element_type.with_code(f"{self.code}.geo_mean()")

    @member_function("STDEVS")
    def std_sample(self: "Array[Number]") -> Number:
        return self.element_type.with_code(f"{self.code}.std_sample()")

    @member_function("STDEVP")
    def std_population(self: "Array[Number]") -> Number:
        return self.element_type.with_code(f"{self.code}.std_population()")

    # Array[Number] Scalar Arithmetic

    @unary_operator("-")
    def neg(self: "Array[Number]") -> "Array[Number]":
        return Array(Number(), f"-{self.code}")

    @binary_operator("+")
    def add(self: "Array[Number]", other: Number) -> "Array[Number]":
        return Array(Number(), f"{self.code} + {other.code}")

    @binary_operator("-")
    def sub(self: "Array[Number]", other: Number) -> "Array[Number]":
        return Array(Number(), f"{self.code} - {other.code}")

    @binary_operator("*")
    def mul(self: "Array[Number]", other: Number) -> "Array[Number]":
        return Array(Number(), f"{self.code} * {other.code}")

    @binary_operator("/")
    def div(self: "Array[Number]", other: Number) -> "Array[Number]":
        return Array(Number(), f"{self.code} / {other.code}")

    @binary_operator("MOD")
    def mod(self: "Array[Number]", other: Number) -> "Array[Number]":
        return Array(Number(), f"{self.code} % {other.code}")

    @binary_operator("^")
    def pow(self: "Array[Number]", power: Number) -> "Array[Number]":
        return Array(Number(), f"{self.code} ^ {power.code}")


class Unknown(Type):
    SEARCH_ORDER: list[type[Type]] = [
        Number,
        Str,
        Bool,
        Date,
        Primitive,
        Array,
        RowRef,
        Type,
    ]

    @property
    def type_annotation(self) -> str:
        return Type.__name__

    def common_with(self, other: "Type") -> "Type":
        return Unknown()

    def unary_operator(self, operator: str) -> "Unknown":
        for candidate_type in self.SEARCH_ORDER:
            func = candidate_type._find_unary_operator(operator)
            if func is not None:
                return Unknown(func(candidate_type.dummy().with_code(self.code)).code)

        raise NameNotFoundError(
            f"{Unknown.__name__} type does not support unary operator {operator}."
        )

    def binary_operator(self, operator: str, other: "Type") -> "Unknown":
        for candidate_type in self.SEARCH_ORDER:
            func = candidate_type._find_binary_operator(operator)
            if func is not None:
                return Unknown(
                    func(candidate_type.dummy().with_code(self.code), other).code
                )

        raise NameNotFoundError(
            f"{Unknown.__name__} type does not support unary operator {operator}."
        )

    def member_function(self, name: str, *args: Unresolved) -> "Unknown":
        for candidate_type in self.SEARCH_ORDER:
            func = candidate_type._find_member_function(name)
            if func is not None:
                return Unknown(
                    func(candidate_type.dummy().with_code(self.code), *args).code
                )

        LOGGER.warning(
            f"Cannot find member function {name} for any supported XL type. "
            f"Resorting to generic mock function."
        )

        return Unknown(f"{self.code}.{name}({", ".join(arg.code for arg in args)})")

    @staticmethod
    @static_function("IF")
    def if_operator(
        condition: Unresolved, true_case: Unresolved, false_case: Unresolved
    ) -> "Type":
        condition_type = condition.resolve()
        true_case_type = true_case.resolve()
        false_case_type = false_case.resolve()

        common_type = Type.common_type(true_case_type, false_case_type) or Unknown()
        return common_type.with_code(
            f"{true_case_type.code} if {condition_type.code} else {false_case_type.code}"
        )

    def static_function(self, name: str, *args: Unresolved) -> Type | None:
        for candidate_type in self.SEARCH_ORDER:
            func = candidate_type._find_static_function(name)
            if func is not None:
                return func(*args)

        func = self._find_static_function(name)
        return func(*args) if func is not None else None
