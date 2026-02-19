from collections.abc import Collection
from io import StringIO

from antlr4.CommonTokenStream import CommonTokenStream
from antlr4.InputStream import InputStream
from public import private, public
from quantgrid.models import Action

from dial.xl.converter.extraction.action_types import (
    FieldAction,
    TableAction,
    filter_field_actions,
    filter_table_actions,
)
from dial.xl.converter.extraction.function_extractor import (
    FunctionExtractor,
    UsedFunction,
)
from dial.xl.converter.grammar.SheetLexer import SheetLexer
from dial.xl.converter.grammar.SheetParser import SheetParser


@public
def extract_function_assertions(
    canonical_solution: dict[str, str],
    diff: Collection[Action],
) -> list[str]:
    functions: set[str] = set()
    for sheet_name, sheet_code in canonical_solution.items():
        parser = _create_parser(sheet_code)
        used_functions = FunctionExtractor.extract_from(parser)

        relevant_functions = _filter_functions(used_functions, diff, sheet_name)
        functions.update(function.function_name for function in relevant_functions)

    return list(functions)


@private
def _create_parser(sheet: str) -> SheetParser:
    lexer = SheetLexer(InputStream(sheet))
    lexer.removeErrorListeners()

    token_stream = CommonTokenStream(lexer)

    parser = SheetParser(token_stream, StringIO())
    parser.removeErrorListeners()

    return parser


@private
def _filter_functions(
    functions: Collection[UsedFunction], diff: Collection[Action], sheet_name: str
) -> list[UsedFunction]:
    sheet_diff = [action for action in diff if action.sheet_name == sheet_name]

    table_actions = filter_table_actions(sheet_diff)
    field_actions = filter_field_actions(sheet_diff)

    filtered: list[UsedFunction] = []
    for function in functions:
        if TableAction(function.table_name) in table_actions:
            filtered.append(function)
            continue

        if (
            function.field_name is not None
            and FieldAction(function.table_name, function.field_name) in field_actions
        ):
            filtered.append(function)
            continue

    return filtered
