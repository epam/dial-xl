import dataclasses
import io
import typing

from antlr4 import Token
from antlr4.CommonTokenStream import CommonTokenStream
from antlr4.InputStream import InputStream
from dial_xl.project import Project
from dial_xl.table import Table

from quantgrid.utils.project import FieldGroupUtil
from quantgrid_2a.models import FunctionInfo
from quantgrid_2a.pseudo.errors import ConversionError
from quantgrid_2a.pseudo.generated.FormulaLexer import FormulaLexer
from quantgrid_2a.pseudo.generated.FormulaParser import FormulaParser
from quantgrid_2a.pseudo.generated.FormulaVisitor import FormulaVisitor
from quantgrid_2a.pseudo.lexer_errors import LexerErrors
from quantgrid_2a.pseudo.parser_errors import ParserErrors
from quantgrid_2a.utils import quote_if_needed, unquote_forced


@dataclasses.dataclass
class FunctionFrame:
    function_name: str
    parameter_index: int


@dataclasses.dataclass
class LambdaScope:
    parent_function: FunctionFrame
    lambda_parameters: typing.List[str]


class _ConvertException(Exception):

    def __init__(self, message: str):
        super(_ConvertException, self).__init__()
        self.message = message


class Converter(FormulaVisitor):

    @staticmethod
    def convert(
        project: Project,
        table: Table,
        parametrized_by: typing.List[str],
        formula: str,
        functions: typing.Dict[str, FunctionInfo],
    ) -> str | typing.List[ConversionError]:
        lexer = FormulaLexer(InputStream(formula))
        lexer_errors = LexerErrors()

        lexer.removeErrorListeners()
        lexer.addErrorListener(lexer_errors)

        token_stream = CommonTokenStream(lexer)
        parser = FormulaParser(token_stream)
        parser_errors = ParserErrors()

        parser.removeErrorListeners()
        parser.addErrorListener(parser_errors)

        tree = parser.input_()
        if len(lexer_errors.syntax_errors) or len(parser_errors.syntax_errors):
            return [
                ConversionError(error)
                for error in (lexer_errors.syntax_errors + parser_errors.syntax_errors)
            ]

        try:
            return Converter(
                token_stream, project, table, parametrized_by, tree, functions
            )._convert()
        except _ConvertException as exception:
            return [ConversionError(exception.message)]

    def __init__(
        self,
        stream: CommonTokenStream,
        project: Project,
        table: Table,
        parametrized_by: typing.List[str],
        root: FormulaParser.InputContext,
        functions: typing.Dict[str, FunctionInfo],
    ):
        super().__init__()

        self._stream = stream
        self._project = project
        self._table = table
        self._parametrized_by = parametrized_by
        self._root = root
        self._supported_functions = functions

        self._lambda_scopes: typing.List[LambdaScope] = []
        self._function_stack: typing.List[FunctionFrame] = []

        self._output = io.StringIO()

    def _convert(self) -> str:
        self.visit(self._root)
        return self._output.getvalue()

    def _append_hidden_tokens(self, token: Token):
        hidden_tokens = self._stream.getHiddenTokensToLeft(token.tokenIndex)

        output: typing.List[str] = []
        for t in hidden_tokens if hidden_tokens is not None else []:
            text: str = t.text
            output.append(text.replace("\n", "\\\n").replace("\r", ""))

        self._output.write("".join(output))

    def visitInput(self, ctx: FormulaParser.InputContext):
        self.visit(ctx.formula())

    def visitString(self, ctx: FormulaParser.StringContext):
        self._append_hidden_tokens(ctx.start)
        self._output.write(
            '"' + ctx.getText()[1:-1].replace("'", "''").replace('"', "'\"") + '"'
        )

    def visitBin_mul_div_mod(self, ctx: FormulaParser.Bin_mul_div_modContext):
        self._append_hidden_tokens(ctx.start)

        text = ctx.getText()
        if text == "%":
            text = "MOD"

        self._output.write(text)

    def visitBin_and(self, ctx: FormulaParser.Bin_andContext):
        self._append_hidden_tokens(ctx.start)
        self._output.write("AND")

    def visitBin_or(self, ctx: FormulaParser.Bin_orContext):
        self._append_hidden_tokens(ctx.start)
        self._output.write("OR")

    def visitBin_compare(self, ctx: FormulaParser.Bin_compareContext):
        self._append_hidden_tokens(ctx.start)

        text = ctx.getText()
        match text:
            case "==":
                text = "="
            case "!=":
                text = "<>"

        self._output.write(text)

    def visitUni_op(self, ctx: FormulaParser.Uni_opContext):
        self._append_hidden_tokens(ctx.start)
        self._output.write(ctx.getText().upper())

    # TODO: Populate error on function hallucination
    def visitFunction_name(self, ctx: FormulaParser.Function_nameContext):
        self._append_hidden_tokens(ctx.start)

        generated_name: str = ctx.getText()
        if generated_name not in self._supported_functions:
            raise _ConvertException(f"Unknown function: {generated_name}.")

        self._output.write(
            self._supported_functions[generated_name].original_name.upper()
        )

    def _find_lambda_parameter_scope(self, name: str) -> LambdaScope | None:
        for scope in reversed(self._lambda_scopes):
            if name in scope.lambda_parameters:
                return scope

        return None

    def _is_parametrized_by(self, name: str) -> bool:
        return name in self._parametrized_by

    def _is_column_parameter(self, name: str) -> bool:
        return name in FieldGroupUtil.get_table_field_names(self._table)

    def _is_table_reference(self, name) -> bool:
        for sheet in self._project.sheets:
            for table_name in sheet.table_names:
                if table_name == name:
                    return True

        return False

    def visitVariable_name(self, ctx: FormulaParser.Variable_nameContext):
        self._append_hidden_tokens(ctx.start)

        variable = unquote_forced(ctx.getText())

        variable_scope = self._find_lambda_parameter_scope(variable)
        if variable_scope is not None and self._lambda_scopes[-1] is variable_scope:
            self._output.write("$")
        elif self._is_parametrized_by(variable):
            self._output.write(f"[{variable}]")
        elif self._is_table_reference(variable):
            self._output.write(quote_if_needed(variable))
        elif (
            variable_scope is not None and self._lambda_scopes[-1] is not variable_scope
        ):
            current_scope = self._lambda_scopes[-1]

            if current_scope is not variable_scope:
                raise _ConvertException(
                    f"Lambda variable scope error. "
                    f"Variable {variable} belongs to lambda in {variable_scope.parent_function.parameter_index + 1} "
                    f"argument of {variable_scope.parent_function.function_name} function, "
                    f"but used by lambda in {current_scope.parent_function.parameter_index + 1} "
                    f"argument of {current_scope.parent_function.function_name} function. "
                    f"QuantGrid lambdas cannot access variables of outer lambdas."
                )
        else:
            base_error = (
                f"Variable scope error. {variable} do not exist in variable scope."
            )
            if self._is_column_parameter(variable):
                base_error += (
                    f" To reference cell from {variable} field, then you must parametrize formula by it."
                    f" To reference array<> of field values, prepend table name (table_name.field_name)"
                )

            raise _ConvertException(base_error)

    def visitParameter(self, ctx: FormulaParser.ParameterContext):
        self._lambda_scopes[-1].lambda_parameters.append(
            ctx.IDENTIFIER().getText()
            if ctx.IDENTIFIER() is not None
            else unquote_forced(ctx.QUOTED_IDENTIFIER().getText())
        )

    def visitOn_indexing(self, ctx: FormulaParser.On_indexingContext):
        if ctx.FLOAT() is not None:
            raise _ConvertException(
                "QuantGrid do not support random-access integer indexing."
            )

        self.visit(ctx.formula())

        text = (
            ctx.IDENTIFIER().getText()
            if ctx.IDENTIFIER() is not None
            else ctx.QUOTED_IDENTIFIER().getText()
        )
        self._output.write(f"[{unquote_forced(text)}]")

    def visitOn_lambda(self, ctx: FormulaParser.On_lambdaContext):
        if len(self._function_stack) == 0:
            raise _ConvertException("Lambdas can only be used as function parameters.")

        self._lambda_scopes.append(LambdaScope(self._function_stack[-1], []))

        for parameter in ctx.parameter():
            self.visitParameter(parameter)

        self.visit(ctx.formula())
        self._lambda_scopes.pop()

    def _process_function_call(
        self,
        ctx: (
            FormulaParser.On_global_functionContext
            | FormulaParser.On_member_functionContext
        ),
        arguments: typing.List[FormulaParser.FormulaContext],
    ):
        self.visitFunction_name(ctx.function_name())

        function_name = ctx.function_name().getText().upper()
        self._output.write("(")
        for i, formula in enumerate(arguments):
            self._function_stack.append(FunctionFrame(function_name, i))

            if i != 0:
                self._output.write(",")

            self.visit(formula)
            self._function_stack.pop()

        self._output.write(")")

    def visitOn_global_function(self, ctx: FormulaParser.On_global_functionContext):
        self._append_hidden_tokens(ctx.start)
        self._process_function_call(ctx, ctx.formula())

    def visitOn_member_function(self, ctx: FormulaParser.On_member_functionContext):
        self.visit(ctx.formula(0))
        self._output.write(".")
        self._process_function_call(ctx, ctx.formula()[1:])

    def visitTerminal(self, node):
        token: Token = node.getSymbol()

        self._append_hidden_tokens(token)

        match token.text:
            case "%":
                self._output.write("MOD")
            case "==":
                self._output.write("=")
            case "!=":
                self._output.write("<>")
            case _:
                self._output.write(token.text)
