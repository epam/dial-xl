package com.epam.deltix.quantgrid.parser;

import com.google.gson.ExclusionStrategy;
import com.google.gson.FieldAttributes;
import com.google.gson.Gson;
import com.google.gson.GsonBuilder;
import lombok.SneakyThrows;
import org.junit.jupiter.api.Test;

import java.nio.file.Files;
import java.nio.file.Path;

import static org.assertj.core.api.Assertions.assertThat;

class SheetParserTest {
    private static final Gson GSON = new GsonBuilder()
            .setPrettyPrinting()
            .serializeSpecialFloatingPointValues()
            .disableHtmlEscaping()
            .create();
    private static final Gson GSON_NO_SPAN = GSON.newBuilder()
            .setExclusionStrategies(new ExclusionStrategy() {
                @Override
                public boolean shouldSkipField(FieldAttributes fieldAttributes) {
                    return "span".equals(fieldAttributes.getName());
                }

                @Override
                public boolean shouldSkipClass(Class<?> aClass) {
                    return false;
                }
            })
            .create();

    @SneakyThrows
    private static String readTestJson(String expectedJsonName) {
        return Files.readString(
                Path.of(SheetParserTest.class.getClassLoader()
                        .getResource("dsl/%s.json".formatted(expectedJsonName))
                        .toURI()));
    }

    private static void assertJsonEquals(String expectedJsonName, ParsedSheet actual) {
        String expectedJson = readTestJson(expectedJsonName);
        assertThat(GSON.toJson(actual)).isEqualToNormalizingNewlines(expectedJson);
    }

    private static void assertStandardJson(ParsedSheet actual) {
        String expectedJson = readTestJson("standard-dsl");
        assertThat(GSON_NO_SPAN.toJson(actual)).isEqualToNormalizingNewlines(expectedJson);
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
        assertStandardJson(SheetReader.parseSheet(sheet));
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
        assertStandardJson(SheetReader.parseSheet(sheet));
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
        assertStandardJson(SheetReader.parseSheet(sheet));
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

        assertJsonEquals("equal-checks", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("complex-field", SheetReader.parseSheet(sheet));
    }

    @Test
    void testMultiWordIdentifiers() {
        String sheet = """
                table 'table t 1'
                  [some field name] = 1
                  [a_2] = "This is data for T1[a]"
                """;

        assertJsonEquals("multi-word-identifiers", SheetReader.parseSheet(sheet));
    }

    @Test
    void testStartFields() {
        String sheet = """
                table 't1'
                  [*] = 1
                  [*] = 2
                """;

        assertJsonEquals("start-fields", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("table-definition-errors", SheetReader.parseSheet(sheet));
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
        assertJsonEquals("field-definition-errors", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("decorator-definition-errors", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("field-expression-definition-error", SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectFunctionDefinition() {
        String sheet = """
                table T2
                  [a] = FUNC(T1 T1 T1)
                """;

        assertJsonEquals("incorrect-function-definition", SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectDefinition2() {
        String sheet = """
                 table T2
                     [x] = FUNC(T1 T1 T1)
                     [y] = 42
                """;

        assertJsonEquals("incorrect-definition-2", SheetReader.parseSheet(sheet));
    }

    @Test
    void testIncorrectDecoratorDefinition() {
        String sheet = """
                !decorator1(4 4 4)
                !decorator2(1, 2, 2)
                table T1
                  [a] = 1
                """;

        assertJsonEquals("incorrect-decorator-definition", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("overrides", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("overrides-with-row-number-key", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("override-with-gaps", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("override-with-multiple-keys", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("override-with-multiple-keys-2", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("override-definition-with-table-after", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("incorrect-override-definition-2", SheetReader.parseSheet(sheet));
    }

    @Test
    void testList() {
        String dsl = """
                table t1
                  [a] = {}
                  [b] = {1, "2"}
                """;

        assertJsonEquals("list", SheetReader.parseSheet(dsl));
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

        assertJsonEquals("escaping", SheetReader.parseSheet(sheet));
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

        assertJsonEquals("apply-and-total-without-order", sheet);
    }

    @Test
    void testKeyAndDimWithoutOrder() {
        String dsl = """
                table A
                  key dim [a] = 1
                  dim key [b] = 2
                """;

        ParsedSheet sheet = SheetReader.parseSheet(dsl);

        assertJsonEquals("key-and-dim-without-order", sheet);
    }

    @Test
    void testMultilineFormulaError() {
        String dsl = """
                table A
                  [a] = 1 +
                    12
                  [b] = (
                    1 + 1
                  )
                  [c] = RANGE(10)
                    .FILTER(RANGE(10) > 5)
                """;

        ParsedSheet sheet = SheetReader.parseSheet(dsl);

        assertJsonEquals("multiline-formula-error", sheet);
    }
}
