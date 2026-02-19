from typing import override

from antlr4 import ParseTreeWalker
from attrs import frozen
from public import public

from dial.xl.converter.grammar.SheetListener import SheetListener
from dial.xl.converter.grammar.SheetParser import SheetParser


@public
@frozen
class UsedFunction:
    table_name: str
    field_name: str | None
    function_name: str


@public
class FunctionExtractor(SheetListener):
    used_functions: list[UsedFunction]

    _table_name: str | None
    _field_group: set[str] | None

    @staticmethod
    def extract_from(parser: SheetParser) -> list[UsedFunction]:
        extractor = FunctionExtractor()
        walker = ParseTreeWalker()

        walker.walk(extractor, parser.sheet())

        return extractor.used_functions

    def __init__(self) -> None:
        self.used_functions = []

        self._table_name = None
        self._field_group = None

    @override
    def enterTable_definition(self, ctx: SheetParser.Table_definitionContext) -> None:
        assert self._table_name is None
        self._table_name = ctx.table_name().getText().strip("'")

    @override
    def exitTable_definition(self, ctx: SheetParser.Table_definitionContext) -> None:
        assert self._table_name is not None
        self._table_name = None

    @override
    def enterFields_definition(self, ctx: SheetParser.Fields_definitionContext) -> None:
        assert self._field_group is None
        self._field_group = set()

        declaration: SheetParser.Field_declarationContext
        for declaration in ctx.field_declaration():
            field_name: SheetParser.Field_nameContext = declaration.field_name()
            self._field_group.add(field_name.getText().strip("[]"))

    @override
    def exitFields_definition(self, ctx: SheetParser.Fields_definitionContext) -> None:
        assert self._field_group is not None
        self._field_group = None

    @override
    def enterFunction_name(self, ctx: SheetParser.Function_nameContext) -> None:
        assert self._table_name is not None
        if self._field_group is None:
            return

        for field_name in self._field_group:
            self.used_functions.append(
                UsedFunction(
                    table_name=self._table_name,
                    field_name=field_name,
                    function_name=ctx.IDENTIFIER().getText(),
                )
            )
