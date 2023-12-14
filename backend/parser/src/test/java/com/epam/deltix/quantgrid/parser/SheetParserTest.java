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
import com.epam.deltix.quantgrid.service.parser.OverrideValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static com.epam.deltix.quantgrid.service.parser.OverrideValue.MISSING;

class SheetParserTest {

    private FieldKey key(String tableName, String fieldName) {
        return new FieldKey(tableName, fieldName);
    }

    private static void assertOverridesEquals(ParsedOverride expected, ParsedOverride actual) {
        if (expected != null && actual != null) {
            Map<FieldKey, ParsedOverride.TypedValue> expectedKeys = expected.keys();
            Map<FieldKey, ParsedOverride.TypedValue> actualKeys = actual.keys();

            Assertions.assertEquals(expected.rowNumberKey(), actual.rowNumberKey());

            Assertions.assertEquals(expectedKeys.size(), actualKeys.size(), "Override keys size do not match");
            expectedKeys.forEach((k, v) -> {
                ParsedOverride.TypedValue actualTypedValue = actualKeys.get(k);
                Assertions.assertNotNull(actualTypedValue, "Missing expected override key: " + k);
                Assertions.assertEquals(v.type(), actualTypedValue.type(), "Override key type doesn't match");
                Assertions.assertIterableEquals(
                        v.value(),
                        actualTypedValue.value(),
                        "Override key values do not match");
            });

            Map<FieldKey, ParsedOverride.TypedValue> expectedFields = expected.fields();
            Map<FieldKey, ParsedOverride.TypedValue> actualFields = actual.fields();

            Assertions.assertEquals(expectedFields.size(), actualFields.size(), "Override fields size do not match");
            expectedFields.forEach((k, v) -> {
                ParsedOverride.TypedValue actualTypedValue = actualFields.get(k);
                Assertions.assertNotNull(actualTypedValue, "Missing expected override field: " + k);
                Assertions.assertEquals(v.type(), actualTypedValue.type(), "Override field type doesn't match");
                Assertions.assertIterableEquals(
                        v.value(),
                        actualTypedValue.value(),
                        "Override field values do not match");
            });
        } else {
            Assertions.assertEquals(expected, actual);
        }
    }

    private static void assertDecoratorEquals(ParsedDecorator a, ParsedDecorator b) {
        Assertions.assertEquals(a.decoratorName(), b.decoratorName(),
                "Decorator names do not match");
        for (int i = 0; i < a.params().length; ++i) {
            Assertions.assertEquals(a.params()[i], b.params()[i], "Decorator params do not match");
        }
    }

    private static void assertFieldEquals(ParsedField a, ParsedField b) {
        Assertions.assertEquals(a.getKey(), b.getKey(),
                "Field names do not match");
        Assertions.assertEquals(a.isKey(), b.isKey(),
                "Field key flags do not match");
        Assertions.assertEquals(a.isDim(), b.isDim(),
                "Field dim flags do not match");

        Assertions.assertEquals(a.getFormula(), b.getFormula(),
                "Fields formula do not match");

        Assertions.assertEquals(a.getDecorators().size(), b.getDecorators().size(),
                "Decorators lists sizes do not match");
        for (int i = 0; i < a.getDecorators().size(); ++i) {
            assertDecoratorEquals(a.getDecorators().get(i), b.getDecorators().get(i));
        }
    }

    private static void assertTableEquals(ParsedTable a, ParsedTable b) {
        Assertions.assertEquals(a.getTableName(), b.getTableName(),
                "Table names do not match");

        Assertions.assertEquals(a.getFields().size(), b.getFields().size(),
                "Fields lists sizes do not match");
        for (int i = 0; i < a.getFields().size(); ++i) {
            assertFieldEquals(a.getFields().get(i), b.getFields().get(i));
        }

        Assertions.assertEquals(a.getDecorators().size(), b.getDecorators().size(),
                "Decorators lists sizes do not match");
        for (int i = 0; i < a.getDecorators().size(); ++i) {
            assertDecoratorEquals(a.getDecorators().get(i), b.getDecorators().get(i));
        }
        assertOverridesEquals(a.getOverrides(), b.getOverrides());
    }

    private static void assertSheetEquals(ParsedSheet a, ParsedSheet b) {
        Assertions.assertEquals(a.getErrors().size(), b.getErrors().size(),
                "Error lists sizes do not match");
        for (int i = 0; i < a.getErrors().size(); ++i) {
            Assertions.assertEquals(a.getErrors().get(i), b.getErrors().get(i), "Error do not match");
        }
        Assertions.assertEquals(a.getTables().size(), b.getTables().size(),
                "Table lists sizes do not match");
        for (int i = 0; i < a.getTables().size(); ++i) {
            assertTableEquals(a.getTables().get(i), b.getTables().get(i));
        }
    }

    public void assertStandardDsl(ParsedSheet parseSheet) {
        assertSheetEquals(
                new ParsedSheet(List.of(
                        new ParsedTable("T1", List.of(
                                new ParsedField(true, false, key("T1", "a"),
                                        new UnaryOperator(new ConstNumber(1), UnaryOperation.NEG),
                                        List.of(new ParsedDecorator("format", "#.##"))),
                                new ParsedField(false, true, key("T1", "b"),
                                        new ConstNumber(2.5), List.of()),
                                new ParsedField(false, false, key("T1", "c"),
                                        new ConstNumber(3.42), List.of()),
                                new ParsedField(true, true, key("T1", "d"),
                                        new ConstNumber(5), List.of())
                        ), List.of(new ParsedDecorator("placement", 1.0, 1.0))),
                        new ParsedTable("T2", List.of(
                                new ParsedField(true, true, key("T2", "x"),
                                        new TableReference("T1"), List.of()),
                                new ParsedField(false, false, key("T2", "y"),
                                        new TableReference("T2"), List.of()),
                                new ParsedField(false, true, key("T2", "z"),
                                        new FieldReference(new TableReference("T1"), "a"),
                                        List.of()),
                                new ParsedField(true, false, key("T2", "w"),
                                        new FieldReference(new CurrentField("x"), "y"), List.of())
                        ), List.of(new ParsedDecorator("placement", 5.0, 1.0)))
                ), List.of(/*No errors*/)
                ), parseSheet);
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
                  key # test comment6
                   [a] = -1
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
                !placement(1, 1)
                table T1
                  !format("#.##") key [a] = -1 dim [b] = 2.5 [c] = 3.42 key dim [d] = 5.00

                !placement(5, 1)
                table T2
                  key dim [x] = T1 [y] = T2 dim [z] = T1[a] key [w] = [x][y]
                """;
        assertStandardDsl(SheetReader.parseSheet(sheet));
    }

    @Test
    void testFlatTables() {
        String sheet = """
                !placement(1, 1) table T1 !format("#.##") key [a] = -1 dim [b] = 2.5 [c] = 3.42 key dim [d] = 5.00

                !placement(5, 1) table T2 key dim [x] = T1 [y] = T2 dim [z] = T1[a] key [w] = [x][y]
                """;
        assertStandardDsl(SheetReader.parseSheet(sheet));
    }

    @Test
    void testEqualChecks() {
        String sheet = """
                table T1
                  [a] = 1
                  [b] = 2
                  [c] = [a] == [b]
                  [d] = [b] == [a]
                """;

        assertSheetEquals(
                new ParsedSheet(List.of(
                        new ParsedTable("T1", List.of(
                                new ParsedField(false, false, key("T1", "a"),
                                        new ConstNumber(1), List.of()),
                                new ParsedField(false, false, key("T1", "b"),
                                        new ConstNumber(2), List.of()),
                                new ParsedField(false, false, key("T1", "c"),
                                        new BinaryOperator(
                                                new CurrentField("a"),
                                                new CurrentField("b"),
                                                BinaryOperation.EQ), List.of()),
                                new ParsedField(false, false, key("T1", "d"),
                                        new BinaryOperator(
                                                new CurrentField("b"),
                                                new CurrentField("a"),
                                                BinaryOperation.EQ), List.of())
                        ), List.of())
                ), List.of(/*No errors*/)
                ), SheetReader.parseSheet(sheet));
    }

    @Test
    void testComplexField() {
        String sheet = """
                table T1
                  [a] = 1


                  [b] = T1.ORDERBY([b], [a]).DISTINCTBY([a], [b])
                    .FILTER(SUM([b]) MOD T1.COUNT() <> $[a])[f][g]
                  [c] = 2
                  [d] = 42
                """;

        assertSheetEquals(
                new ParsedSheet(List.of(
                        new ParsedTable("T1", List.of(
                                new ParsedField(false, false, key("T1", "a"),
                                        new ConstNumber(1), List.of()),
                                new ParsedField(false, false, key("T1", "b"),
                                        new FieldReference(
                                                new FieldReference(
                                                        new Function("FILTER",
                                                                new Function(
                                                                        "DISTINCTBY",
                                                                        new Function(
                                                                                "ORDERBY",
                                                                                new TableReference("T1"),
                                                                                new CurrentField("b"),
                                                                                new CurrentField("a")
                                                                        ),
                                                                        new CurrentField("a"),
                                                                        new CurrentField("b")),
                                                                new BinaryOperator(
                                                                        new BinaryOperator(
                                                                                new Function("SUM",
                                                                                        new CurrentField("b")),
                                                                                new Function("COUNT",
                                                                                        new TableReference(
                                                                                                "T1")),
                                                                                BinaryOperation.MOD),
                                                                        new FieldReference(
                                                                                new QueryRow(),
                                                                                "a"),
                                                                        BinaryOperation.NEQ
                                                                )),
                                                        "f"),
                                                "g"),
                                        List.of()),
                                new ParsedField(false, false, key("T1", "c"),
                                        new ConstNumber(2), List.of()),
                                new ParsedField(false, false, key("T1", "d"),
                                        new ConstNumber(42), List.of())), List.of())
                ), List.of(/*No errors*/)
                ), SheetReader.parseSheet(sheet));
    }

    @Test
    void testMultiWordIdentifiers() {
        String sheet = """
                table 'table t 1'
                  [some field name] = 1
                  [a_2] = "This is data for T1[a]"
                """;

        assertSheetEquals(
                new ParsedSheet(
                        List.of(new ParsedTable(
                                "table t 1",
                                List.of(new ParsedField(
                                                false,
                                                false,
                                                key("table t 1", "some field name"),
                                                new ConstNumber(1),
                                                List.of()),
                                        new ParsedField(
                                                false,
                                                false,
                                                key("table t 1", "a_2"),
                                                new ConstText("This is data for T1[a]"),
                                                List.of())
                                ),
                                List.of()
                        )),
                        List.of()),
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
                new ParsedSheet(
                        List.of(new ParsedTable(
                                "t1",
                                List.of(new ParsedField(
                                                false,
                                                false,
                                                key("t1", "*"),
                                                new ConstNumber(1),
                                                List.of()),
                                        new ParsedField(
                                                false,
                                                false,
                                                key("t1", "*"),
                                                new ConstNumber(2),
                                                List.of())
                                ),
                                List.of()
                        )),
                        List.of()),
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
                                        .decorators(List.of())
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(3))
                                                        .build()))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("missing {UPPER_CASE_IDENTIFIER, LOWER_CASE_IDENTIFIER, IDENTIFIER,"
                                                + " MULTI_WORD_TABLE_IDENTIFIER} at '[a]'")
                                        .line(3)
                                        .position(4)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing table name")
                                        .line(3)
                                        .position(4)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing table name")
                                        .line(9)
                                        .position(6)
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(5))
                                                        .build()))
                                        .decorators(List.of())
                                        .build(),
                                ParsedTable.builder()
                                        .tableName("t2")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t2", "c"))
                                                        .formula(new ConstNumber(6))
                                                        .build()))
                                        .decorators(List.of())
                                        .build(),
                                ParsedTable.builder()
                                        .tableName("t3")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t3", "a"))
                                                        .formula(new ConstNumber(1))
                                                        .build()))
                                        .decorators(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("token recognition error at: '[a\\n'")
                                        .line(2)
                                        .position(2)
                                        .build(),
                                ParsingError.builder()
                                        .message("extraneous input '=' expecting {<EOF>, '!', 'table'}")
                                        .line(11)
                                        .position(4)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing field name")
                                        .line(6)
                                        .position(3)
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
                                        .tableName("t1")
                                        .fields(List.of())
                                        .decorators(List.of(new ParsedDecorator("placement", 2d, 2d)))
                                        .build(),
                                ParsedTable.builder()
                                        .tableName("t2")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of(new ParsedDecorator("format", "number")))
                                                        .key(key("t2", "x"))
                                                        .formula(new ConstNumber(5))
                                                        .build()))
                                        .decorators(List.of(
                                                new ParsedDecorator("format", "#.##"),
                                                new ParsedDecorator("placement", 1d, 1d)
                                        ))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input '!' expecting {FLOAT, STRING_LITERAL}")
                                        .line(2)
                                        .position(0)
                                        .build(),
                                ParsingError.builder()
                                        .message("mismatched input 'key' expecting '('")
                                        .line(5)
                                        .position(2)
                                        .build(),
                                ParsingError.builder()
                                        .message("extraneous input 'dim' expecting {'!', 'table'}")
                                        .line(7)
                                        .position(2)
                                        .build(),
                                ParsingError.builder()
                                        .message("mismatched input '[c]' expecting '('")
                                        .line(14)
                                        .position(4)
                                        .build(),
                                ParsingError.builder()
                                        .message("Missing table name")
                                        .line(13)
                                        .position(4)
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isKey(true)
                                                        .formula(new BinaryOperator(
                                                                new ConstNumber(1),
                                                                new ConstNumber(2),
                                                                BinaryOperation.ADD))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new BinaryOperator(
                                                                new CurrentField("a"),
                                                                new CurrentField("d"),
                                                                BinaryOperation.ADD))
                                                        .build()))
                                        .decorators(List.of())
                                        .build(),
                                ParsedTable.builder()
                                        .tableName("t2")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t2", "x"))
                                                        .formula(new ConstNumber(5))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t2", "c"))
                                                        .formula(new ConstNumber(3))
                                                        .build()))
                                        .decorators(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("extraneous input 'dim' expecting {'-', 'NOT', '$', 'NA', '(',"
                                                + " FLOAT, UPPER_CASE_IDENTIFIER, LOWER_CASE_IDENTIFIER, IDENTIFIER,"
                                                + " STRING_LITERAL, FIELD_NAME, MULTI_WORD_TABLE_IDENTIFIER}")
                                        .line(5)
                                        .position(2)
                                        .tableName("t1")
                                        .fieldName("c")
                                        .build(),
                                ParsingError.builder()
                                        .message("extraneous input '=' expecting {<EOF>, '!', 'table'}")
                                        .line(5)
                                        .position(10)
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
                                        .tableName("T2")
                                        .decorators(List.of())
                                        .fields(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input 'T1' expecting {',', ')'}")
                                        .line(2)
                                        .position(16)
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
                                        .tableName("T2")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("T2", "y"))
                                                        .formula(new ConstNumber(42))
                                                        .build()))
                                        .decorators(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input 'T1' expecting {',', ')'}")
                                        .line(2)
                                        .position(19)
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
                                        .tableName("T1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("T1", "a"))
                                                        .formula(new ConstNumber(1))
                                                        .build()))
                                        .decorators(List.of(new ParsedDecorator("decorator2", 1.0, 2.0, 2.0)))
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("mismatched input '4' expecting {',', ')'}")
                                        .line(1)
                                        .position(14)
                                        .build()))
                        .build(),
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new ConstNumber(5))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .overrides(new ParsedOverride(null,
                                                Map.of(new FieldKey("t1", "a"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(new OverrideValue(0),
                                                                        new OverrideValue(1),
                                                                        new OverrideValue(2), new OverrideValue(3)))),
                                                Map.of(new FieldKey("t1", "b"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.STRING,
                                                                ObjectArrayList.of(new OverrideValue("USA"),
                                                                        new OverrideValue("UK"),
                                                                        new OverrideValue("Spain"),
                                                                        new OverrideValue("Poland")))),
                                                4))
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .overrides(new ParsedOverride(
                                                new ParsedOverride.TypedValue(ColumnType.DOUBLE,
                                                        ObjectArrayList.of(new OverrideValue(0), new OverrideValue(1),
                                                                new OverrideValue(2), new OverrideValue(3))),
                                                Map.of(),
                                                Map.of(new FieldKey("t1", "b"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.STRING,
                                                                ObjectArrayList.of(new OverrideValue("USA"),
                                                                        new OverrideValue("UK"),
                                                                        new OverrideValue("Spain"),
                                                                        new OverrideValue("Poland")))),
                                                4))
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new ConstNumber(5))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .overrides(new ParsedOverride(null,
                                                Map.of(new FieldKey("t1", "a"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(new OverrideValue(0),
                                                                        new OverrideValue(1),
                                                                        new OverrideValue(2), new OverrideValue(3)))),
                                                Map.of(new FieldKey("t1", "b"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.STRING,
                                                                ObjectArrayList.of(new OverrideValue("USA"),
                                                                        new OverrideValue("UK"),
                                                                        MISSING,
                                                                        new OverrideValue("Poland"))),
                                                        new FieldKey("t1", "c"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(MISSING, new OverrideValue(250),
                                                                        MISSING, MISSING))),
                                                4))
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "x"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(5)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new ConstNumber(5))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .overrides(new ParsedOverride(null,
                                                Map.of(new FieldKey("t1", "a"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(new OverrideValue(0),
                                                                        new OverrideValue(0),
                                                                        new OverrideValue(2), new OverrideValue(2))),
                                                        new FieldKey("t1", "x"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(new OverrideValue(1),
                                                                        new OverrideValue(2),
                                                                        new OverrideValue(3), new OverrideValue(4)))),
                                                Map.of(new FieldKey("t1", "b"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.STRING,
                                                                ObjectArrayList.of(new OverrideValue("USA"),
                                                                        MISSING,
                                                                        new OverrideValue("Spain"),
                                                                        new OverrideValue("Poland"))),
                                                        new FieldKey("t1", "c"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(MISSING, new OverrideValue(250),
                                                                        new OverrideValue(300), MISSING))),
                                                4))
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "x"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(5)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new ConstNumber(5))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .overrides(new ParsedOverride(null,
                                                Map.of(new FieldKey("t1", "a"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(new OverrideValue(0),
                                                                        new OverrideValue(0),
                                                                        new OverrideValue(2), new OverrideValue(2))),
                                                        new FieldKey("t1", "x"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(new OverrideValue(1),
                                                                        new OverrideValue(2),
                                                                        new OverrideValue(3), new OverrideValue(4)))),
                                                Map.of(new FieldKey("t1", "b"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.STRING,
                                                                ObjectArrayList.of(new OverrideValue("USA"),
                                                                        MISSING,
                                                                        new OverrideValue("Spain"),
                                                                        new OverrideValue("Poland"))),
                                                        new FieldKey("t1", "c"),
                                                        new ParsedOverride.TypedValue(
                                                                ColumnType.DOUBLE,
                                                                ObjectArrayList.of(MISSING, new OverrideValue(250),
                                                                        new OverrideValue(300), MISSING))),
                                                4))
                                        .build()))
                        .errors(List.of())
                        .build(),
                SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectOverrideDefinition() {
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "x"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(5)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new ConstNumber(5))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("Override section seems to be incorrect. Please, check definition")
                                        .line(7)
                                        .position(0)
                                        .tableName("t1")
                                        .build()))
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
                                        .tableName("t1")
                                        .fields(List.of(
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "a"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(4)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "x"))
                                                        .isDim(true)
                                                        .isKey(true)
                                                        .formula(new Function("RANGE",
                                                                new ConstNumber(5)))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "b"))
                                                        .formula(new ConstNumber(Double.NaN))
                                                        .build(),
                                                ParsedField.builder()
                                                        .decorators(List.of())
                                                        .key(key("t1", "c"))
                                                        .formula(new ConstNumber(5))
                                                        .build()
                                        ))
                                        .decorators(List.of())
                                        .build()))
                        .errors(List.of(
                                ParsingError.builder()
                                        .message("Override section seems to be incorrect. Please, check definition")
                                        .line(7)
                                        .position(0)
                                        .tableName("t1")
                                        .build()))
                        .build(),
                SheetReader.parseSheet(sheet));
    }
}
