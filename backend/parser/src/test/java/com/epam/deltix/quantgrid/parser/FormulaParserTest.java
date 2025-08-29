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

import static org.assertj.core.api.Assertions.assertThat;

class FormulaParserTest {
    private static final String SHEET_NAME = "<unknown>";
    @Test
    void parseNumber() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("1.42");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new ConstNumber(
                        new Span(SHEET_NAME, "1.42", 0, 4),
                        1.42));
    }

    @Test
    void parseString() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("\"test string\"");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new ConstText(
                        new Span(SHEET_NAME, "\"test string\"", 0, 13),
                        "test string"));
    }

    @Test
    void parseTable() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new TableReference(
                        new Span(SHEET_NAME, "Table1", 0, 6),
                        "Table1"));
    }

    @Test
    void parseCurrentField() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[Field1]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new CurrentField(
                        new Span(SHEET_NAME, "[Field1]", 0, 8),
                        "Field1"));
    }

    @Test
    void parseField() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1[Field1]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new FieldReference(
                        new Span(SHEET_NAME, "Table1[Field1]", 0, 14),
                        new TableReference(new Span(SHEET_NAME, "Table1", 0, 6), "Table1"),
                        "Field1"));
    }

    @Test
    void parseBinOp() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] + [b] ");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new BinaryOperator(
                        new Span(SHEET_NAME, "[a] + [b]", 0, 9),
                        new CurrentField(new Span(SHEET_NAME, "[a]", 0, 3), "a"),
                        new CurrentField(new Span(SHEET_NAME, "[b]", 6, 9), "b"),
                        BinaryOperation.ADD));
    }

    @Test
    void parseUniOp() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("NOT [a]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new UnaryOperator(
                        new Span(SHEET_NAME, "NOT [a]", 0, 7),
                        new CurrentField(new Span(SHEET_NAME, "[a]", 4, 7), "a"),
                        UnaryOperation.NOT));
    }


    @Test
    void parseFormulaWithBrackets() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] * ([b] + [c])");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new BinaryOperator(
                        new Span(SHEET_NAME, "[a] * ([b] + [c])", 0, 17),
                        new CurrentField(new Span(SHEET_NAME, "[a]", 0, 3), "a"),
                        new BinaryOperator(
                                new Span(SHEET_NAME, "[b] + [c]", 7, 16),
                                new CurrentField(new Span(SHEET_NAME, "[b]", 7, 10), "b"),
                                new CurrentField(new Span(SHEET_NAME, "[c]", 13, 16), "c"),
                                BinaryOperation.ADD),
                        BinaryOperation.MUL));
    }

    @Test
    void parseFormulaMulAddDiv() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] * [b] + [c] / [d]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new BinaryOperator(
                        new Span(SHEET_NAME, "[a] * [b] + [c] / [d]", 0, 21),
                        new BinaryOperator(
                                new Span(SHEET_NAME, "[a] * [b]", 0, 9),
                                new CurrentField(new Span(SHEET_NAME, "[a]", 0, 3), "a"),
                                new CurrentField(new Span(SHEET_NAME, "[b]", 6, 9), "b"),
                                BinaryOperation.MUL),
                        new BinaryOperator(
                                new Span(SHEET_NAME, "[c] / [d]", 12, 21),
                                new CurrentField(new Span(SHEET_NAME, "[c]", 12, 15), "c"),
                                new CurrentField(new Span(SHEET_NAME, "[d]", 18, 21), "d"),
                                BinaryOperation.DIV),
                        BinaryOperation.ADD));
    }

    @Test
    void parseFormulaEqAndNeq() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("[a] = [b] AND [c] <> [d]");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new BinaryOperator(
                        new Span(SHEET_NAME, "[a] = [b] AND [c] <> [d]", 0, 24),
                        new BinaryOperator(
                                new Span(SHEET_NAME, "[a] = [b]", 0, 9),
                                new CurrentField(new Span(SHEET_NAME, "[a]", 0, 3), "a"),
                                new CurrentField(new Span(SHEET_NAME, "[b]", 6, 9), "b"),
                                BinaryOperation.EQ),
                        new BinaryOperator(
                                new Span(SHEET_NAME, "[c] <> [d]", 14, 24),
                                new CurrentField(new Span(SHEET_NAME, "[c]", 14, 17), "c"),
                                new CurrentField(new Span(SHEET_NAME, "[d]", 21, 24), "d"),
                                BinaryOperation.NEQ),
                        BinaryOperation.AND));
    }

    @Test
    void parseLast() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1.LAST()");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new Function(
                        new Span(SHEET_NAME, "Table1.LAST()", 0, 13),
                        "LAST",
                        new TableReference(new Span(SHEET_NAME, "Table1", 0, 6), "Table1")));
    }

    @Test
    void parseFirst() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("FIRST(Table1)");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new Function(
                        new Span(SHEET_NAME, "FIRST(Table1)", 0, 13),
                        "FIRST",
                        new TableReference(new Span(SHEET_NAME, "Table1", 6, 12), "Table1")));
    }

    @Test
    void parseQueryRow() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("$");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new QueryRow(new Span(SHEET_NAME, "$", 0, 1)));
    }

    @Test
    void parseFilter() {
        ParsedFormula parsedFormula = SheetReader.parseFormula("Table1.FILTER($ < 10)");
        Assertions.assertTrue(parsedFormula.errors().isEmpty(),
                "Unexpected errors " + parsedFormula.errors());

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new Function(
                        new Span(SHEET_NAME, "Table1.FILTER($ < 10)", 0, 21),
                        "FILTER",
                        new TableReference(new Span(SHEET_NAME, "Table1", 0, 6), "Table1"),
                        new BinaryOperator(
                                new Span(SHEET_NAME, "$ < 10", 14, 20),
                                new QueryRow(new Span(SHEET_NAME, "$", 14, 15)),
                                new ConstNumber(new Span(SHEET_NAME, "10", 18, 20), 10),
                                BinaryOperation.LT)));
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

        assertThat(parsedFormula.formula())
                .usingRecursiveComparison()
                .isEqualTo(new CurrentField(
                        new Span(SHEET_NAME, "[test '[ '] '' test]", 0, 20),
                        "test [ ] ' test"));
    }
}
