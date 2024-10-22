package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

class FormulaParserTest {
    @Test
    void parseNumber() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("1.42");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new ConstNumber(1.42),
                parsedFormula.formula());
    }

    @Test
    void parseString() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("\"test string\"");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new ConstText("test string"),
                parsedFormula.formula());
    }

    @Test
    void parseTable() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new TableReference("Table1"),
                parsedFormula.formula());
    }

    @Test
    void parseCurrentField() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[Field1]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(new CurrentField("Field1"), parsedFormula.formula());
    }

    @Test
    void parseField() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1[Field1]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new FieldReference(new TableReference("Table1"), "Field1"),
                parsedFormula.formula());
    }

    @Test
    void parseBinOp() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] + [b] ");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new BinaryOperator(
                        new CurrentField("a"),
                        new CurrentField("b"),
                        BinaryOperation.ADD),
                parsedFormula.formula());
    }

    @Test
    void parseUniOp() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("NOT [a]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new UnaryOperator(
                        new CurrentField("a"),
                        UnaryOperation.NOT),
                parsedFormula.formula());
    }


    @Test
    void parseFormulaWithBrackets() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] * ([b] + [c])");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new BinaryOperator(
                        new CurrentField("a"),
                        new BinaryOperator(
                                new CurrentField("b"),
                                new CurrentField("c"),
                                BinaryOperation.ADD),
                        BinaryOperation.MUL),
                parsedFormula.formula());
    }

    @Test
    void parseFormulaMulAddDiv() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] * [b] + [c] / [d]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new BinaryOperator(
                        new BinaryOperator(
                                new CurrentField("a"), new CurrentField("b"),
                                BinaryOperation.MUL),
                        new BinaryOperator(
                                new CurrentField("c"), new CurrentField("d"),
                                BinaryOperation.DIV),
                        BinaryOperation.ADD),
                parsedFormula.formula());
    }

    @Test
    void parseFormulaEqAndNeq() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] = [b] AND [c] <> [d]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new BinaryOperator(
                        new BinaryOperator(
                                new CurrentField("a"), new CurrentField("b"),
                                BinaryOperation.EQ),
                        new BinaryOperator(
                                new CurrentField("c"), new CurrentField("d"),
                                BinaryOperation.NEQ),
                        BinaryOperation.AND),
                parsedFormula.formula());
    }

    @Test
    void parseLast() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1.LAST()");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new Function(
                        "LAST",
                        new TableReference("Table1")),
                parsedFormula.formula());
    }

    @Test
    void parseFirst() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("FIRST(Table1)");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new Function(
                        "FIRST",
                        new TableReference("Table1")),
                parsedFormula.formula());
    }

    @Test
    void parseQueryRow() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("$");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new QueryRow(),
                parsedFormula.formula());
    }

    @Test
    void parseFilter() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1.FILTER($ < 10)");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(
                new Function("FILTER",
                        new TableReference("Table1"),
                        new BinaryOperator(
                                new QueryRow(),
                                new ConstNumber(10),
                                BinaryOperation.LT)),
                parsedFormula.formula());
    }

    @Test
    void tryIncorrectFormula1() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1 Table2");
        Assertions.assertEquals(
                parsedFormula.errors(),
                List.of(new ParsingError(1, 8, "extraneous input 'Table2' expecting <EOF>"))
        );
    }


    @Test
    void tryIncorrectFormula2() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1.SUM");
        Assertions.assertEquals(
                parsedFormula.errors(),
                List.of(new ParsingError(1, 11, "mismatched input '<EOF>' expecting '('"))
        );
    }

    @Test
    void tryIncorrectFormula3() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1.Table2");
        Assertions.assertEquals(
                parsedFormula.errors(),
                List.of(new ParsingError(1, 14, "mismatched input '<EOF>' expecting '('"))
        );
    }

    @Test
    void parseFieldWithEscapes() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[test '[ '] '' test]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        Assertions.assertEquals(new CurrentField("test [ ] ' test"), parsedFormula.formula());
    }
}
