package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperator;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.CurrentField;
import com.epam.deltix.quantgrid.parser.ast.FieldReference;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.parser.ast.Function;
import com.epam.deltix.quantgrid.parser.ast.QueryRow;
import com.epam.deltix.quantgrid.parser.ast.TableReference;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperation;
import com.epam.deltix.quantgrid.parser.ast.UnaryOperator;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class SheetParserTest {
    private static Span span(int from, int to) {
        return new Span(from, to);
    }

    private static ParsedText text(int from, int to, String text) {
        return new ParsedText(span(from, to), text);
    }

    private static ParsedFormula formula(int from, int to, Formula formula) {
        return new ParsedFormula(span(from, to), formula, List.of());
    }

    private static ParsedPrimitive primitive(int from, int to, Object value) {
        return new ParsedPrimitive(span(from, to), value);
    }

    private static void assertSheetEquals(ParsedSheet a, ParsedSheet b) {
        assertSheetEquals(a, b, false);
    }

    private static void assertSheetEquals(ParsedSheet a, ParsedSheet b, boolean ignoreSpan) {
        Assertions.assertEquals(a.errors().size(), b.errors().size(),
                "Error lists sizes do not match");
        for (int i = 0; i < a.errors().size(); ++i) {
            Assertions.assertEquals(a.errors().get(i), b.errors().get(i), "Error do not match");
        }
        Assertions.assertEquals(a.tables().size(), b.tables().size(),
                "Table lists sizes do not match");
        for (int i = 0; i < a.tables().size(); ++i) {
            if (ignoreSpan) {
                assertThat(b.tables().get(i))
                        .usingRecursiveComparison()
                        .ignoringFieldsOfTypes(Span.class)
                        .isEqualTo(a.tables().get(i));
            } else {
                Assertions.assertEquals(a.tables().get(i), b.tables().get(i));
            }
        }
    }

    private static void assertStandardDsl(ParsedSheet parseSheet) {
        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 0))
                                        .docs(List.of())
                                        .decorators(List.of(
                                                new ParsedDecorator(
                                                        span(0, 0),
                                                        text(0, 0, "placement"),
                                                        List.of(
                                                                primitive(0, 0, 1.0),
                                                                primitive(0, 0, 1.0)))))
                                        .name(text(0, 0, "T1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of(
                                                                new ParsedDecorator(
                                                                        span(0, 0),
                                                                        text(0, 0, "format"),
                                                                        List.of(primitive(0, 0, "#.##")))))
                                                        .key(text(0, 0, "key"))
                                                        .name(text(0, 0, "a"))
                                                        .formula(formula(0, 0, new ConstNumber(-1)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .dim(text(0, 0, "dim"))
                                                        .name(text(0, 0, "b"))
                                                        .formula(formula(0, 0, new ConstNumber(2.5)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(0, 0, "c"))
                                                        .formula(formula(0, 0, new ConstNumber(3.42)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(0, 0, "key"))
                                                        .dim(text(0, 0, "dim"))
                                                        .name(text(0, 0, "d"))
                                                        .formula(formula(0, 0, new ConstNumber(5)))
                                                        .build()))
                                        .build(),
                                ParsedTable.builder()
                                        .span(span(0, 0))
                                        .docs(List.of())
                                        .decorators(List.of(
                                                new ParsedDecorator(
                                                        span(0, 0),
                                                        text(0, 0, "placement"),
                                                        List.of(primitive(0, 0, 5.0), primitive(0, 0, 1.0)))))
                                        .name(text(0, 0, "T2"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(0, 0, "key"))
                                                        .dim(text(0, 0, "dim"))
                                                        .name(text(0, 0, "x"))
                                                        .formula(formula(0, 0,
                                                                new TableReference("T1")))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(0, 0, "y"))
                                                        .formula(formula(0, 0,
                                                                new TableReference("T2")))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .dim(text(0, 0, "dim"))
                                                        .name(text(0, 0, "z"))
                                                        .formula(formula(0, 0,
                                                                new FieldReference(new TableReference("T1"), "a")))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(0, 0))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(0, 0, "key"))
                                                        .name(text(0, 0, "w"))
                                                        .formula(formula(0, 0,
                                                                new FieldReference(
                                                                        new CurrentField("x"),
                                                                        "y")))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                parseSheet, true);
    }

    @Test
    void basicTest() {
        String sheet = """
                # test comment1
                                
                # test comment2
                !placement(1, 1)
                # test comment3
                # test comment4
                table T1
                  # test comment5
                  !format("#.##")
                  key [a] = -1
                  # test comment7
                  # test comment8
                  dim [b] = 2.5
                  # test field
                  [c] = 3.42
                  key dim [d] = 5.00
                  # test comment9
                  # test comment10

                !placement(5, 1)
                table T2
                  key dim [x] = T1
                  [y] = T2
                  dim [z] = T1[a]
                  key [w] = [x][y]
                 # test comment11
                """;
        assertStandardDsl(SheetReader.parseSheet(sheet));
    }

    @Test
    void testFlatFields() {
        String sheet = """
                !placement(1, 1) table T1
                  !format("#.##") key [a] = -1 
                  dim [b] = 2.5 
                  [c] = 3.42 
                  key dim [d] = 5.00

                !placement(5, 1) table T2
                  key dim [x] = T1
                  [y] = T2
                  dim [z] = T1[a]
                  key [w] = [x][y]
                """;
        assertStandardDsl(SheetReader.parseSheet(sheet));
    }

    @Test
    void testFlatTables() {
        String sheet = """
                !placement(1, 1) table T1 
                !format("#.##") key [a] = -1 
                dim [b] = 2.5 
                [c] = 3.42 
                key dim [d] = 5.00

                !placement(5, 1) table T2
                key dim [x] = T1 
                [y] = T2 
                dim [z] = T1[a] 
                key [w] = [x][y]
                """;
        assertStandardDsl(SheetReader.parseSheet(sheet));
    }

    @Test
    void testEqualChecks() {
        String sheet = """
                table T1
                  [a] = 1
                  [b] = 2
                  [c] = [a] = [b]
                  [d] = [b] = [a]
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 65))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "T1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(11, 18))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(11, 14, "a"))
                                                        .formula(formula(17, 18, new ConstNumber(1)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(21, 28))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(21, 24, "b"))
                                                        .formula(formula(27, 28, new ConstNumber(2)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(31, 46))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(31, 34, "c"))
                                                        .formula(formula(37, 46,
                                                                new BinaryOperator(
                                                                        new CurrentField("a"),
                                                                        new CurrentField("b"),
                                                                        BinaryOperation.EQ)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(49, 64))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(49, 52, "d"))
                                                        .formula(formula(55, 64,
                                                                new BinaryOperator(
                                                                        new CurrentField("b"),
                                                                        new CurrentField("a"),
                                                                        BinaryOperation.EQ)))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testComplexField() {
        String sheet = """
                table T1
                  [a] = 1


                  [b] = T1.SORTBY([b], [a]).UNIQUEBY([a], [b]) \
                    .FILTER(SUM([b]) MOD T1.COUNT() <> $[a])[f][g]
                  [c] = 2
                  [d] = 42
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 140))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "T1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(11, 18))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(11, 14, "a"))
                                                        .formula(formula(17, 18, new ConstNumber(1)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(23, 118))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(23, 26, "b"))
                                                        .formula(formula(29, 118,
                                                                new FieldReference(
                                                                        new FieldReference(
                                                                                new Function("FILTER",
                                                                                        new Function(
                                                                                                "UNIQUEBY",
                                                                                                new Function(
                                                                                                        "SORTBY",
                                                                                                        new TableReference(
                                                                                                                "T1"),
                                                                                                        new CurrentField(
                                                                                                                "b"),
                                                                                                        new CurrentField(
                                                                                                                "a")
                                                                                                ),
                                                                                                new CurrentField("a"),
                                                                                                new CurrentField("b")),
                                                                                        new BinaryOperator(
                                                                                                new BinaryOperator(
                                                                                                        new Function(
                                                                                                                "SUM",
                                                                                                                new CurrentField(
                                                                                                                        "b")),
                                                                                                        new Function(
                                                                                                                "COUNT",
                                                                                                                new TableReference(
                                                                                                                        "T1")),
                                                                                                        BinaryOperation.MOD),
                                                                                                new FieldReference(
                                                                                                        new QueryRow(),
                                                                                                        "a"),
                                                                                                BinaryOperation.NEQ
                                                                                        )),
                                                                                "f"),
                                                                        "g")))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(121, 128))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(121, 124, "c"))
                                                        .formula(formula(127, 128, new ConstNumber(2)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(131, 139))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(131, 134, "d"))
                                                        .formula(formula(137, 139, new ConstNumber(42)))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testMultiWordIdentifiers() {
        String sheet = """
                table 'table t 1'
                  [some field name] = 1
                  [a_2] = "This is data for T1[a]"
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 77))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 17, "table t 1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(20, 41))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(20, 37, "some field name"))
                                                        .formula(formula(40, 41, new ConstNumber(1)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(44, 76))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(44, 49, "a_2"))
                                                        .formula(formula(52, 76,
                                                                new ConstText("This is data for T1[a]")))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testStartFields() {
        String sheet = """
                table 't1'
                  [*] = 1
                  [*] = 2
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 31))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 10, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .span(span(13, 20))
                                                        .name(text(13, 16, "*"))
                                                        .formula(formula(19, 20, new ConstNumber(1)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .span(span(23, 30))
                                                        .name(text(23, 26, "*"))
                                                        .formula(formula(29, 30, new ConstNumber(2)))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testTableDefinitionErrors() {
        String sheet = """
                # invalid table name(missing)
                table
                    [a] = 5
                # valid table name
                table t1
                    [b] = 3
                                
                # invalid table name(empty)
                table ' '
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(67, 117))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(73, 75, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(80, 87))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(80, 83, "b"))
                                                        .formula(formula(86, 87, new ConstNumber(3)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("missing {IDENTIFIER, MULTI_WORD_TABLE_IDENTIFIER} at '[a]'")
                                        .line(3)
                                        .position(5)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing table name")
                                        .line(3)
                                        .position(5)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing table name")
                                        .line(9)
                                        .position(7)
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testFieldDefinitionErrors() {
        // TODO try to handle case when 'key' or 'dim' present before invalid '[a' definition,
        //  currently it's move keywords to the next valid field definition
        String sheet = """
                table t1
                  [a
                  [b] = 5
                  
                table t2
                   [   ] = 5
                   [c] = 6
                   
                table t3
                    [a] = 1
                    = 7
                """;
        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 25))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(16, 23))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(16, 19, "b"))
                                                        .formula(formula(22, 23, new ConstNumber(5)))
                                                        .build()))
                                        .build(),
                                ParsedTable.builder()
                                        .span(span(25, 59))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(31, 33, "t2"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(50, 57))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(50, 53, "c"))
                                                        .formula(formula(56, 57, new ConstNumber(6)))
                                                        .build()))
                                        .build(),
                                ParsedTable.builder()
                                        .span(span(59, 80))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(65, 67, "t3"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(72, 79))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(72, 75, "a"))
                                                        .formula(formula(78, 79, new ConstNumber(1)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("token recognition error at: '[a\\n'")
                                        .line(2)
                                        .position(3)
                                        .build(),
                                ParsingError.builder()
                                        .message(
                                                "extraneous input '=' expecting {<EOF>, '!', 'table', PYTHON_BLOCK, LINE_BREAK, DOC_COMMENT}")
                                        .line(11)
                                        .position(5)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing field name")
                                        .line(6)
                                        .position(4)
                                        .tableName("t2")
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testDecoratorDefinitionErrors() {
        // TODO first placement makes parse tree incorrect for the whole sheet
        //  we need to fix it somehow
        String sheet = """
                !placement(1,
                !placement(2,2)
                table t1
                  !asd
                  key [a] = 1 + 2
                  !format("#.##")
                  dim [c] = 5
                                
                !placement(1,1)
                table t2
                    !format("number")
                    [x] = 5
                    !format
                    [c] = 3
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 39))
                                        .docs(List.of())
                                        .decorators(List.of(
                                                new ParsedDecorator(
                                                        span(14, 30),
                                                        text(15, 24, "placement"),
                                                        List.of(primitive(25, 26, 2.0), primitive(27, 28, 2.0)))))
                                        .name(text(36, 38, "t1"))
                                        .fields(List.of())
                                        .build(),
                                ParsedTable.builder()
                                        .span(span(41, 156))
                                        .docs(List.of())
                                        .decorators(List.of(
                                                new ParsedDecorator(
                                                        span(63, 82),
                                                        text(67, 73, "format"),
                                                        List.of(primitive(74, 80, "#.##"))),
                                                new ParsedDecorator(
                                                        span(95, 113),
                                                        text(98, 107, "placement"),
                                                        List.of(primitive(108, 109, 1.0), primitive(110, 111, 1.0)))))
                                        .name(text(119, 121, "t2"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(126, 155))
                                                        .docs(List.of())
                                                        .decorators(List.of(
                                                                new ParsedDecorator(
                                                                        span(126, 144),
                                                                        text(127, 133, "format"),
                                                                        List.of(primitive(134, 142, "number")))))
                                                        .name(text(148, 151, "x"))
                                                        .formula(formula(154, 155, new ConstNumber(5)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input '!' expecting {FLOAT, STRING_LITERAL}")
                                        .line(2)
                                        .position(1)
                                        .build(),
                                ParsingError.builder()
                                        .message("mismatched input 'key' expecting {'(', LINE_BREAK}")
                                        .line(5)
                                        .position(3)
                                        .build(),
                                ParsingError.builder()
                                        .message("extraneous input 'dim' expecting {'!', 'table', LINE_BREAK}")
                                        .line(7)
                                        .position(3)
                                        .build(),
                                ParsingError.builder()
                                        .message("mismatched input '[c]' expecting {'(', LINE_BREAK}")
                                        .line(14)
                                        .position(5)
                                        .build(),
                                ParsingError.builder()
                                        .message("mismatched input '<EOF>' expecting {'(', LINE_BREAK}")
                                        .line(15)
                                        .position(1)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing table name")
                                        .line(13)
                                        .position(5)
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testFieldExpressionDefinitionError() {
        // TODO following DSL shows how ANTLR produce incorrect tree, we need to think how to solve such issues
        String sheet = """
                table t1
                  key [a] = 1 + 2
                  # incorrect binop expression
                  [c] = [a] +
                  dim [d] = 5
                                
                table t2
                    [x] = 5
                    [c] = 3
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 87))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(11, 26))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(11, 14, "key"))
                                                        .name(text(15, 18, "a"))
                                                        .formula(formula(
                                                                21, 26, new BinaryOperator(
                                                                        new ConstNumber(1),
                                                                        new ConstNumber(2),
                                                                        BinaryOperation.ADD)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(74, 85))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .dim(text(74, 77, "dim"))
                                                        .name(text(78, 81, "d"))
                                                        .formula(formula(84, 85, new ConstNumber(5)))
                                                        .build()))
                                        .build(),
                                ParsedTable.builder()
                                        .span(span(87, 120))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(93, 95, "t2"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(100, 107))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(100, 103, "x"))
                                                        .formula(formula(106, 107, new ConstNumber(5)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(112, 119))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(112, 115, "c"))
                                                        .formula(formula(118, 119, new ConstNumber(3)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message(
                                                "mismatched input '\\n' expecting {'-', 'NOT', '$', 'NA', '{', '(', FLOAT, IDENTIFIER, STRING_LITERAL, FIELD_NAME, MULTI_WORD_TABLE_IDENTIFIER}")
                                        .line(4)
                                        .position(14)
                                        .tableName("t1")
                                        .fieldName("c")
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectFunctionDefinition() {
        String sheet = """
                table T2
                  [a] = FUNC(T1 T1 T1)
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 32))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "T2"))
                                        .fields(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input 'T1' expecting {',', ')'}")
                                        .line(2)
                                        .position(17)
                                        .tableName("T2")
                                        .fieldName("a")
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectDefinition2() {
        String sheet = """
                 table T2
                     [x] = FUNC(T1 T1 T1)
                     [y] = 42
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(1, 50))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(7, 9, "T2"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(41, 49))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(41, 44, "y"))
                                                        .formula(formula(47, 49, new ConstNumber(42)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input 'T1' expecting {',', ')'}")
                                        .line(2)
                                        .position(20)
                                        .tableName("T2")
                                        .fieldName("x")
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectDecoratorDefinition() {
        String sheet = """
                !decorator1(4 4 4)
                !decorator2(1, 2, 2)
                table T1
                  [a] = 1
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 59))
                                        .docs(List.of())
                                        .decorators(List.of(
                                                new ParsedDecorator(
                                                        span(18, 40),
                                                        text(20, 30, "decorator2"),
                                                        List.of(
                                                                primitive(31, 32, 1.0),
                                                                primitive(34, 35, 2.0),
                                                                primitive(37, 38, 2.0)))))
                                        .name(text(46, 48, "T1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(51, 58))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(51, 54, "a"))
                                                        .formula(formula(57, 58, new ConstNumber(1)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                        ParsingError.builder()
                                                .message("mismatched input '4' expecting {',', ')', LINE_BREAK}")
                                                .line(1)
                                                .position(15)
                                                .build()
                                )
                        ).build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testOverrides() {
        String sheet = """
                table t1
                key dim [a] = RANGE(4)
                        [b] = NA
                        [c] = 5
                override
                key [a], [b]
                0, "USA"
                1, "UK"
                2, "Spain"
                3, "Poland"
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 127))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(40, 48))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(40, 43, "b"))
                                                        .formula(formula(46, 48, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(57, 64))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(57, 60, "c"))
                                                        .formula(formula(63, 64, new ConstNumber(5)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(65, 127),
                                                List.of(text(78, 81, "a"), text(83, 86, "b")),
                                                List.of(
                                                        List.of(
                                                                formula(87, 88, new ConstNumber(0)),
                                                                formula(90, 95, new ConstText("USA"))),
                                                        List.of(
                                                                formula(96, 97, new ConstNumber(1)),
                                                                formula(99, 103, new ConstText("UK"))),
                                                        List.of(
                                                                formula(104, 105, new ConstNumber(2)),
                                                                formula(107, 114, new ConstText("Spain"))),
                                                        List.of(
                                                                formula(115, 116, new ConstNumber(3)),
                                                                formula(118, 126, new ConstText("Poland")))),
                                                "t1"))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testOverridesWithRowNumberKey() {
        String sheet = """
                table t1
                key dim [a] = RANGE(4)
                        [b] = NA
                override
                row, [b]
                0, "USA"
                1, "UK"
                2, "Spain"
                3, "Poland"
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 107))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(40, 48))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(40, 43, "b"))
                                                        .formula(formula(46, 48, new ConstNumber(Double.NaN)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(49, 107),
                                                List.of(text(58, 61, "_row_20318401841084276546"), text(63, 66, "b")),
                                                List.of(
                                                        List.of(
                                                                formula(67, 68, new ConstNumber(0)),
                                                                formula(70, 75, new ConstText("USA"))),
                                                        List.of(
                                                                formula(76, 77, new ConstNumber(1)),
                                                                formula(79, 83, new ConstText("UK"))),
                                                        List.of(
                                                                formula(84, 85, new ConstNumber(2)),
                                                                formula(87, 94, new ConstText("Spain"))),
                                                        List.of(
                                                                formula(95, 96, new ConstNumber(3)),
                                                                formula(98, 106, new ConstText("Poland")))),
                                                "t1"))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testOverrideWithGaps() {
        String sheet = """
                table t1
                key dim [a] = RANGE(4)
                        [b] = NA
                        [c] = 5
                override
                [b], [c], key [a]
                "USA",,0
                "UK", 250, 1
                , , 2
                "Poland",,3
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 132))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(40, 48))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(40, 43, "b"))
                                                        .formula(formula(46, 48, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(57, 64))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(57, 60, "c"))
                                                        .formula(formula(63, 64, new ConstNumber(5)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(65, 132),
                                                List.of(
                                                        text(74, 77, "b"),
                                                        text(79, 82, "c"),
                                                        text(88, 91, "a")),
                                                List.of(
                                                        List.of(
                                                                formula(92, 97, new ConstText("USA")),
                                                                formula(98, 98, null),
                                                                formula(99, 100, new ConstNumber(0))),
                                                        List.of(
                                                                formula(101, 105, new ConstText("UK")),
                                                                formula(107, 110, new ConstNumber(250)),
                                                                formula(112, 113, new ConstNumber(1))),
                                                        List.of(
                                                                formula(114, 114, null),
                                                                formula(116, 116, null),
                                                                formula(118, 119, new ConstNumber(2))),
                                                        List.of(
                                                                formula(120, 128, new ConstText("Poland")),
                                                                formula(129, 129, null),
                                                                formula(130, 131, new ConstNumber(3)))),
                                                "t1"))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testOverrideWithMultipleKeys() {
        String sheet = """
                table t1
                key dim [a] = RANGE(4)
                key dim [x] = RANGE(5)
                        [b] = NA
                        [c] = 5
                override
                key [a], [b], key [x], [c]
                0, "USA", 1,
                0,, 2, 250
                2,"Spain", 3, 300
                2,"Poland", 4,              
                """;

        // add spaces between terminal newlines
        sheet = sheet + "      \n";

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 181))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(32, 54))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(32, 35, "key"))
                                                        .dim(text(36, 39, "dim"))
                                                        .name(text(40, 43, "x"))
                                                        .formula(formula(
                                                                46, 54, new Function("RANGE", new ConstNumber(5))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(63, 71))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(63, 66, "b"))
                                                        .formula(formula(69, 71, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(80, 87))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(80, 83, "c"))
                                                        .formula(formula(86, 87, new ConstNumber(5)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(88, 181),
                                                List.of(
                                                        text(101, 104, "a"),
                                                        text(106, 109, "b"),
                                                        text(115, 118, "x"),
                                                        text(120, 123, "c")),
                                                List.of(
                                                        List.of(
                                                                formula(124, 125, new ConstNumber(0)),
                                                                formula(127, 132, new ConstText("USA")),
                                                                formula(134, 135, new ConstNumber(1)),
                                                                formula(136, 136, null)),
                                                        List.of(
                                                                formula(137, 138, new ConstNumber(0)),
                                                                formula(139, 139, null),
                                                                formula(141, 142, new ConstNumber(2)),
                                                                formula(144, 147, new ConstNumber(250))),
                                                        List.of(
                                                                formula(148, 149, new ConstNumber(2)),
                                                                formula(150, 157, new ConstText("Spain")),
                                                                formula(159, 160, new ConstNumber(3)),
                                                                formula(162, 165, new ConstNumber(300))),
                                                        List.of(
                                                                formula(166, 167, new ConstNumber(2)),
                                                                formula(168, 176, new ConstText("Poland")),
                                                                formula(178, 179, new ConstNumber(4)),
                                                                formula(180, 180, null))),
                                                "t1"))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testOverrideWithMultipleKeys2() {
        String sheet = "table t1\n"
                + "key dim [a] = RANGE(4)\n"
                + "key dim [x] = RANGE(5)\n"
                + "        [b] = NA\n"
                + "        [c] = 5\n"
                + "override\n"
                + "key [a], [b], key [x], [c]\n"
                + "0, \"USA\", 1,\n"
                + "0,, 2, 250\n"
                + "2,\"Spain\", 3, 300\n"
                + "2,\"Poland\", 4,";

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 181))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(32, 54))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(32, 35, "key"))
                                                        .dim(text(36, 39, "dim"))
                                                        .name(text(40, 43, "x"))
                                                        .formula(formula(
                                                                46, 54, new Function("RANGE", new ConstNumber(5))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(63, 71))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(63, 66, "b"))
                                                        .formula(formula(69, 71, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(80, 87))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(80, 83, "c"))
                                                        .formula(formula(86, 87, new ConstNumber(5)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(88, 181),
                                                List.of(
                                                        text(101, 104, "a"),
                                                        text(106, 109, "b"),
                                                        text(115, 118, "x"),
                                                        text(120, 123, "c")),
                                                List.of(
                                                        List.of(
                                                                formula(124, 125, new ConstNumber(0)),
                                                                formula(127, 132, new ConstText("USA")),
                                                                formula(134, 135, new ConstNumber(1)),
                                                                formula(136, 136, null)),
                                                        List.of(
                                                                formula(137, 138, new ConstNumber(0)),
                                                                formula(139, 139, null),
                                                                formula(141, 142, new ConstNumber(2)),
                                                                formula(144, 147, new ConstNumber(250))),
                                                        List.of(
                                                                formula(148, 149, new ConstNumber(2)),
                                                                formula(150, 157, new ConstText("Spain")),
                                                                formula(159, 160, new ConstNumber(3)),
                                                                formula(162, 165, new ConstNumber(300))),
                                                        List.of(
                                                                formula(166, 167, new ConstNumber(2)),
                                                                formula(168, 176, new ConstText("Poland")),
                                                                formula(178, 179, new ConstNumber(4)),
                                                                formula(180, 180, null))),
                                                "t1"))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testOverrideDefinitionWithTableAfter() {
        String sheet = """
                table t1
                key dim [a] = RANGE(4)
                key dim [x] = RANGE(5)
                        [b] = NA
                        [c] = 5
                # missing trailing newline in override section
                override
                key [a], [b], key [x], [c]
                0, "USA", 1,
                0,, 2, 250
                2,"Spain", 3, 300
                2,"Poland", 4,
                table t2
                    [a] = 7
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 228))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(32, 54))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(32, 35, "key"))
                                                        .dim(text(36, 39, "dim"))
                                                        .name(text(40, 43, "x"))
                                                        .formula(formula(
                                                                46, 54, new Function("RANGE", new ConstNumber(5))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(63, 71))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(63, 66, "b"))
                                                        .formula(formula(69, 71, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(80, 87))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(80, 83, "c"))
                                                        .formula(formula(86, 87, new ConstNumber(5)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(135, 228),
                                                List.of(
                                                        text(148, 151, "a"),
                                                        text(153, 156, "b"),
                                                        text(162, 165, "x"),
                                                        text(167, 170, "c")),
                                                List.of(
                                                        List.of(
                                                                formula(171, 172, new ConstNumber(0)),
                                                                formula(174, 179, new ConstText("USA")),
                                                                formula(181, 182, new ConstNumber(1)),
                                                                formula(183, 183, null)),
                                                        List.of(
                                                                formula(184, 185, new ConstNumber(0)),
                                                                formula(186, 186, null),
                                                                formula(188, 189, new ConstNumber(2)),
                                                                formula(191, 194, new ConstNumber(250))),
                                                        List.of(
                                                                formula(195, 196, new ConstNumber(2)),
                                                                formula(197, 204, new ConstText("Spain")),
                                                                formula(206, 207, new ConstNumber(3)),
                                                                formula(209, 212, new ConstNumber(300))),
                                                        List.of(
                                                                formula(213, 214, new ConstNumber(2)),
                                                                formula(215, 223, new ConstText("Poland")),
                                                                formula(225, 226, new ConstNumber(4)),
                                                                formula(227, 227, null))),
                                                "t1"))
                                        .build(),
                                ParsedTable.builder()
                                        .span(span(228, 249))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(234, 236, "t2"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(241, 248))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(241, 244, "a"))
                                                        .formula(formula(247, 248, new ConstNumber(7)))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }


    @Test
    void testIncorrectOverrideDefinition2() {
        String sheet = """
                table t1
                key dim [a] = RANGE(4)
                key dim [x] = RANGE(5)
                        [b] = NA
                        [c] = 5
                # wrong values number in some rows
                override
                key [a], [b], key [x], [c]
                0, "USA", 1, 5, 7, 8, 9
                0,
                2,"Spain", 3, 300, 15, 75, 120
                2,"Poland", 4,

                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 232))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 31))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 20, "a"))
                                                        .formula(formula(
                                                                23, 31, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(32, 54))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(32, 35, "key"))
                                                        .dim(text(36, 39, "dim"))
                                                        .name(text(40, 43, "x"))
                                                        .formula(formula(
                                                                46, 54, new Function("RANGE", new ConstNumber(5))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(63, 71))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(63, 66, "b"))
                                                        .formula(formula(69, 71, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(80, 87))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(80, 83, "c"))
                                                        .formula(formula(86, 87, new ConstNumber(5)))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("Expected 4 values per row, but was: 7")
                                        .line(7)
                                        .position(1)
                                        .tableName("t1")
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testList() {
        String dsl = """
                table t1
                  [a] = {}
                  [b] = {1, "2"}
                """;

        assertSheetEquals(ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 37))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(11, 19))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(11, 14, "a"))
                                                        .formula(formula(17, 19, new Function("LIST")))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(22, 36))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(22, 25, "b"))
                                                        .formula(formula(
                                                                28, 36, new Function(
                                                                        "LIST",
                                                                        new ConstNumber(1),
                                                                        new ConstText("2"))))
                                                        .build()))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(dsl));
    }

    @Test
    void testEscaping() {
        String sheet = """
                table t1
                key dim [a''] = RANGE(4)
                        [b] = NA
                        [c] = 5
                override
                key [a''], [b]
                0, "USA'""
                1, "UK"
                2, "Spain"
                3, "Poland"
                """;

        assertSheetEquals(
                ParsedSheet.builder()
                        .tables(List.of(
                                ParsedTable.builder()
                                        .span(span(0, 133))
                                        .docs(List.of())
                                        .decorators(List.of())
                                        .name(text(6, 8, "t1"))
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .span(span(9, 33))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .key(text(9, 12, "key"))
                                                        .dim(text(13, 16, "dim"))
                                                        .name(text(17, 22, "a'"))
                                                        .formula(formula(
                                                                25, 33, new Function("RANGE", new ConstNumber(4))))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(42, 50))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(42, 45, "b"))
                                                        .formula(formula(48, 50, new ConstNumber(Double.NaN)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .span(span(59, 66))
                                                        .docs(List.of())
                                                        .decorators(List.of())
                                                        .name(text(59, 62, "c"))
                                                        .formula(formula(65, 66, new ConstNumber(5)))
                                                        .build()))
                                        .overrides(new ParsedOverride(
                                                span(67, 133),
                                                List.of(text(80, 85, "a'"), text(87, 90, "b")),
                                                List.of(
                                                        List.of(
                                                                formula(91, 92, new ConstNumber(0)),
                                                                formula(94, 101, new ConstText("USA\""))),
                                                        List.of(
                                                                formula(102, 103, new ConstNumber(1)),
                                                                formula(105, 109, new ConstText("UK"))),
                                                        List.of(
                                                                formula(110, 111, new ConstNumber(2)),
                                                                formula(113, 120, new ConstText("Spain"))),
                                                        List.of(
                                                                formula(121, 122, new ConstNumber(3)),
                                                                formula(124, 132, new ConstText("Poland")))),
                                                "t1"))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testApplyAndTotalWithoutOrder() {
        String dsl = """
                table A
                  [a] = NA
                total
                  [a] = 1
                apply
                  filter [a]
                total
                  [a] = 2
                apply
                  sort [a]
                """;

        ParsedSheet sheet = SheetReader.parseSheet(dsl);

        Assertions.assertIterableEquals(List.of(
                new ParsingError(9, 1, "Only one apply section is expected", "A", null)
        ), sheet.errors());

        ParsedTable table = sheet.tables().get(0);
        Assertions.assertEquals("A", table.tableName());
        Assertions.assertEquals(new ParsedApply(new CurrentField("a"), null), table.apply());
        Assertions.assertEquals(1, table.total().fields().size());
        Assertions.assertEquals(2, table.total().size());
    }

    @Test
    void testKeyAndDimWithoutOrder() {
        String dsl = """
                table A
                  key dim [a] = 1
                  dim key [b] = 2
                """;

        ParsedSheet sheet = SheetReader.parseSheet(dsl);
        Assertions.assertEquals(0, sheet.errors().size());

        ParsedTable table = sheet.tables().get(0);
        Assertions.assertEquals("A", table.tableName());

        Assertions.assertIterableEquals(List.of(
                ParsedField.builder()
                                .span(span(10, 25))
                                .docs(List.of())
                                .decorators(List.of())
                                .key(text(10, 13, "key"))
                                .dim(text(14, 17, "dim"))
                                .name(text(18, 21, "a"))
                                .formula(formula(24, 25, new ConstNumber(1)))
                                .build(),
                ParsedField.builder()
                        .span(span(28, 43))
                        .docs(List.of())
                        .decorators(List.of())
                        .dim(text(28, 31, "dim"))
                        .key(text(32, 35, "key"))
                        .name(text(36, 39, "b"))
                        .formula(formula(42, 43, new ConstNumber(2)))
                        .build()
        ), table.fields());
    }
}
