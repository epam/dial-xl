from typing import cast

from antlr4 import CommonTokenStream, InputStream

from quantgrid.python.xl.antlr.FormulaLexer import FormulaLexer
from quantgrid.python.xl.antlr.FormulaParser import FormulaParser
from quantgrid.python.xl.antlr.FormulaVisitor import FormulaVisitor
from quantgrid.python.xl.context import NESTED_FUNCTION, MainFunction
from quantgrid.python.xl.exceptions import NodeNotFoundError
from quantgrid.python.xl.types import (
    Array,
    Number,
    RowRef,
    Str,
    Type,
    Unknown,
    Unresolved,
)
from quantgrid.utils.string import pythonize, unquote_forced


# TODO[Functionality][Code Translation]: We need to pass converted formulas to agent,
class XLFormulaConverter(FormulaVisitor):
    ROW_NUMBER_VARIABLE = "row_num"
    ROW_REF_VARIABLE = "row_ref"

    @staticmethod
    def convert_field(
        *,
        table_name_mapping: dict[str, str],
        field_name_mapping: dict[str, dict[str, str]],
        table_ui_name: str,
        table_var_name: str,
        field_var_name: str,
        return_annotation: str,
        xl_formula: str,
    ) -> str:
        lexer = FormulaLexer(InputStream(xl_formula))
        lexer.removeErrorListeners()

        token_stream = CommonTokenStream(lexer)

        parser = FormulaParser(token_stream)
        parser.removeErrorListeners()

        with MainFunction(
            table_var_name,
            field_var_name,
            f"{field_var_name}_function",
            {
                XLFormulaConverter.ROW_NUMBER_VARIABLE: "Number",
                XLFormulaConverter.ROW_REF_VARIABLE: f"RowRef['{table_var_name}']",
            },
            return_annotation,
        ) as main_function:
            converter = XLFormulaConverter(
                table_name_mapping, field_name_mapping, table_ui_name
            )
            main_function.set_expression(converter.visit(parser.formula()).code)

            if not converter.row_num_used:
                main_function.remove_parameter(XLFormulaConverter.ROW_NUMBER_VARIABLE)

            if not converter.row_ref_used:
                main_function.remove_parameter(XLFormulaConverter.ROW_REF_VARIABLE)

        return main_function.code()

    def __init__(
        self,
        table_name_mapping: dict[str, str],
        field_name_mapping: dict[str, dict[str, str]],
        table_ui_name: str,
    ):
        super().__init__()

        self._table_name_mapping = table_name_mapping
        self._field_name_mapping = field_name_mapping

        self._table_ui_name = table_ui_name

        self._row_num_used = False
        self._row_ref_used = False

    @property
    def row_num_used(self) -> bool:
        return self._row_num_used

    @property
    def row_ref_used(self) -> bool:
        return self._row_ref_used

    def visitFormula(self, ctx: FormulaParser.FormulaContext) -> Type:
        return self.visit(ctx.expression())

    def visitExprNumber(self, ctx: FormulaParser.ExprNumberContext) -> Number:
        return Number(ctx.getText())

    def visitExprString(self, ctx: FormulaParser.ExprStringContext) -> Str:
        # TODO[Functionality][Converter]: Convert any XL-like escape characters
        return Str(ctx.getText())

    def visitExprGlobalFunction(
        self, ctx: FormulaParser.ExprGlobalFunctionContext
    ) -> Type:
        function_name: str = ctx.function_name().getText().upper()
        if function_name == "ROW":
            self._row_num_used = True
            return Number(XLFormulaConverter.ROW_NUMBER_VARIABLE)

        expressions = ctx.expression()
        arguments = [UnresolvedNode(self, expr) for expr in expressions]
        global_function = Unknown().static_function(function_name, *arguments)

        if global_function is not None:
            return global_function

        instance: Type = self.visit(expressions[0])
        typed_result = instance.member_function(function_name, *arguments[1:])

        if typed_result is None:
            return Unknown(instance.code).member_function(function_name, *arguments[1:])

        return typed_result

    def visitExprMemberFunction(
        self, ctx: FormulaParser.ExprMemberFunctionContext
    ) -> Type:
        function_name: str = ctx.function_name().getText().upper()

        expressions = ctx.expression()
        instance: Type = self.visit(expressions[0])
        arguments: list[UnresolvedNode] = [
            UnresolvedNode(self, expr) for expr in expressions[1:]
        ]

        typed_result = instance.member_function(function_name, *arguments)
        if typed_result is None:
            return Unknown(instance.code).member_function(function_name, *arguments)

        return typed_result

    def visitExprTableFieldSlice(
        self, ctx: FormulaParser.ExprTableFieldSliceContext
    ) -> Type:
        table_ui_name = unquote_forced(ctx.table_name().getText())
        field_ui_name = ctx.field_name().getText().strip("[]")

        table_var_name: str = self._get_table_var_name(table_ui_name)
        field_var_name: str = self._get_field_var_name(field_ui_name, table_ui_name)

        return Array(RowRef(), f"Array.from_field({table_var_name}.{field_var_name})")

    def visitExprGenericFieldSlice(
        self, ctx: FormulaParser.ExprGenericFieldSliceContext
    ) -> Type:
        expression: Type = self.visit(ctx.expression())

        field_ui_name: str = ctx.field_name().getText().strip("[]")
        field_var_name = self._get_field_var_name(field_ui_name)

        if isinstance(expression, Array):
            return Array(Unknown(), f"{expression.code}.{field_var_name}")

        return Unknown(f"{expression.code}.{field_var_name}")

    def visitExprTableName(self, ctx: FormulaParser.ExprTableNameContext) -> Type:
        table_ui_name: str = unquote_forced(ctx.table_name().getText())
        table_var_name = self._get_table_var_name(table_ui_name)

        return Array(RowRef(), f"Array.from_table({table_var_name})")

    def visitExprParenthesis(self, ctx: FormulaParser.ExprParenthesisContext) -> Type:
        inside: Type = self.visit(ctx.expression())
        return inside.with_code(f"({inside.code})")

    def visitExprPow(self, ctx: FormulaParser.ExprPowContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_pow().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(ctx.bin_pow().getText(), right)

        return typed_result

    def visitExprUnaryOperator(
        self, ctx: FormulaParser.ExprUnaryOperatorContext
    ) -> Type:
        operand: Type = self.visit(ctx.expression())
        typed_result = operand.unary_operator(ctx.uni_op().getText())
        if typed_result is None:
            return Unknown(operand.code).unary_operator(ctx.uni_op().getText())

        return typed_result

    def visitExprMulDivMod(self, ctx: FormulaParser.ExprMulDivModContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_mul_div_mod().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(
                ctx.bin_mul_div_mod().getText(), right
            )

        return typed_result

    def visitExprAddSub(self, ctx: FormulaParser.ExprAddSubContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_add_sub().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(
                ctx.bin_add_sub().getText(), right
            )

        return typed_result

    # TODO[Consistency][Conversion]: Currently, we search only one-way binary operators.
    #  However, ~potentially~ two-way (py style) checking needs to be implemented.
    def visitExprCompare(self, ctx: FormulaParser.ExprCompareContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_compare().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(
                ctx.bin_compare().getText(), right
            )

        return typed_result

    def visitExprAnd(self, ctx: FormulaParser.ExprAndContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_and().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(ctx.bin_and().getText(), right)

        return typed_result

    def visitExprOr(self, ctx: FormulaParser.ExprOrContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_or().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(ctx.bin_or().getText(), right)

        return typed_result

    def visitExprConcat(self, ctx: FormulaParser.ExprConcatContext) -> Type:
        left: Type = self.visit(ctx.expression(0))
        right: Type = self.visit(ctx.expression(1))

        typed_result = left.binary_operator(ctx.bin_concat().getText(), right)
        if typed_result is None:
            return Unknown(left.code).binary_operator(ctx.bin_concat().getText(), right)

        return typed_result

    def visitExprFieldReference(
        self, ctx: FormulaParser.ExprFieldReferenceContext
    ) -> Type:
        self._row_ref_used = True

        field_ui_name: str = ctx.field_name().getText().strip("[]")
        field_var_name: str = self._get_field_var_name(
            field_ui_name, self._table_ui_name
        )

        return Unknown(f"{XLFormulaConverter.ROW_REF_VARIABLE}.{field_var_name}")

    def visitExprDollar(self, ctx: FormulaParser.ExprDollarContext) -> Type:
        nested_function = NESTED_FUNCTION.get()
        if nested_function is None:
            raise NodeNotFoundError("Nested Function is not defined.")

        return nested_function.param_type.with_code(nested_function.param_name)

    # TODO[Functionality][Key Fields]: Support table indexing.

    def visitExprNa(self, ctx: FormulaParser.ExprNaContext) -> Type:
        return Unknown("NA")

    def visitExprList(self, ctx: FormulaParser.ExprListContext) -> Array:
        elements: list[Type] = [self.visit(elem) for elem in ctx.expression()]
        return Array(Unknown(), "[" + ", ".join(elem.code for elem in elements) + "]")

    def _get_field_var_name(
        self, field_ui_name: str, table_ui_name: str | None = None
    ) -> str:
        if table_ui_name is not None:
            field_name_mapping = self._field_name_mapping.get(table_ui_name, {})
            if field_ui_name in field_name_mapping:
                return field_name_mapping[field_ui_name]

        for field_name_mapping in self._field_name_mapping.values():
            if field_ui_name in field_name_mapping:
                return field_name_mapping[field_ui_name]

        return pythonize(field_ui_name)

    def _get_table_var_name(self, table_ui_name: str) -> str:
        return self._table_name_mapping.get(table_ui_name, pythonize(table_ui_name))


class UnresolvedNode(Unresolved):
    def __init__(
        self, converter: XLFormulaConverter, node: FormulaParser.ExpressionContext
    ):
        self._converter = converter
        self._node = node
        self._result: Type | None = None

    def resolve(self) -> Type:
        if self._result is not None:
            return self._result

        self._result = cast(Type, self._converter.visit(self._node))
        return self._result

    @property
    def code(self) -> str:
        return self.resolve().code
