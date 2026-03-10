package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelTableKey;
import com.epam.deltix.quantgrid.engine.service.input.Range;
import com.epam.deltix.quantgrid.engine.service.input.storage.excel.ExcelWorkbook;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.ints.Int2ObjectOpenHashMap;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.InputStream;
import java.util.Arrays;
import java.util.Comparator;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class ExcelInputParserTest {
    @Test
    void testInferTableSchema() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet1",
                6,
                13,
                List.of(
                        new ColumnMetadata("string", 3, InputColumnType.STRING),
                        new ColumnMetadata("bool", 4, InputColumnType.BOOLEAN),
                        new ColumnMetadata("double", 5, InputColumnType.DOUBLE),
                        new ColumnMetadata("date-time", 6, InputColumnType.DATE_TIME),
                        new ColumnMetadata("date", 7, InputColumnType.DATE)));
        ExcelTableKey key = ExcelTableKey.fromQuery("table=Table1");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testInferSheetSchema() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet1",
                6,
                18,
                List.of(
                        new ColumnMetadata("Column2", 1, InputColumnType.DOUBLE),
                        new ColumnMetadata("Column2_2", 2, InputColumnType.STRING),
                        new ColumnMetadata("string", 3, InputColumnType.STRING),
                        new ColumnMetadata("bool", 4, InputColumnType.STRING),
                        new ColumnMetadata("double", 5, InputColumnType.DOUBLE),
                        new ColumnMetadata("date-time", 6, InputColumnType.DATE_TIME),
                        new ColumnMetadata("date", 7, InputColumnType.DATE),
                        new ColumnMetadata("Column8", 9, InputColumnType.STRING),
                        new ColumnMetadata("a", 10, InputColumnType.DOUBLE),
                        new ColumnMetadata("b", 11, InputColumnType.DOUBLE),
                        new ColumnMetadata("c", 12, InputColumnType.DOUBLE)));
        ExcelTableKey key = ExcelTableKey.fromQuery("sheet=Sheet1&headers=true");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testInferSheetAreaSchema() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet1",
                6,
                12, // Does not include an empty row in the end
                List.of(
                        new ColumnMetadata("string", 3, InputColumnType.STRING),
                        new ColumnMetadata("bool", 4, InputColumnType.BOOLEAN),
                        new ColumnMetadata("double", 5, InputColumnType.DOUBLE),
                        new ColumnMetadata("date-time", 6, InputColumnType.DATE_TIME),
                        new ColumnMetadata("date", 7, InputColumnType.DATE)));
        ExcelTableKey key = ExcelTableKey.fromQuery("sheet=Sheet1&range=D6:H13&headers=true");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testInferSheetSchemaWithHeadersOnEmptySheet() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet2",
                -1,
                -1,
                List.of());
        ExcelTableKey key = ExcelTableKey.fromQuery("sheet=Sheet2&headers=true");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testInferSheetSchemaOnEmptySheet() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet2",
                -1,
                -1,
                List.of());
        ExcelTableKey key = ExcelTableKey.fromQuery("sheet=Sheet2");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testInferSheetSchemaWithHeadersOnSingleCell() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet3",
                -1,
                -1,
                List.of(new ColumnMetadata("123", 0, InputColumnType.DOUBLE)));
        ExcelTableKey key = ExcelTableKey.fromQuery("sheet=Sheet3&headers=true");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testInferSheetSchemaOnSingleCell() throws IOException {
        ExcelInputMetadata.ExcelTable expected = new ExcelInputMetadata.ExcelTable(
                "Sheet3",
                0,
                1,
                List.of(new ColumnMetadata("Column1", 0, InputColumnType.DOUBLE)));
        ExcelTableKey key = ExcelTableKey.fromQuery("sheet=Sheet3");
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelInputMetadata.ExcelTable actual = ExcelInputParser.inferSchema(stream, key);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testParseExcelInput() throws IOException {
        List<String> columnNames = List.of("string", "bool", "double", "date-time", "date");
        ExcelInputMetadata.ExcelTable metadata = new ExcelInputMetadata.ExcelTable(
                "Sheet1",
                6,
                13,
                List.of(
                        new ColumnMetadata(columnNames.get(0), 3, InputColumnType.STRING),
                        new ColumnMetadata(columnNames.get(1), 4, InputColumnType.BOOLEAN),
                        new ColumnMetadata(columnNames.get(2), 5, InputColumnType.DOUBLE),
                        new ColumnMetadata(columnNames.get(3), 6, InputColumnType.DATE_TIME),
                        new ColumnMetadata(columnNames.get(4), 7, InputColumnType.DATE)));

        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            LocalTable expected = new LocalTable(
                    new StringDirectColumn(Strings.EMPTY, "TRUE", "1", "abc", Strings.EMPTY, Strings.ERROR_NA,
                            Strings.EMPTY),
                    new DoubleDirectColumn(1, Doubles.EMPTY, 0, 1, Doubles.EMPTY, Doubles.ERROR_NA, Doubles.EMPTY),
                    new DoubleDirectColumn(1, -20, Doubles.EMPTY, -19, Doubles.EMPTY, Doubles.ERROR_NA, Doubles.EMPTY),
                    new DoubleDirectColumn(46055, 45630, 40858.5, Doubles.EMPTY, Doubles.EMPTY, Doubles.ERROR_NA,
                            Doubles.EMPTY),
                    new DoubleDirectColumn(46055, 45630, 40858, Doubles.EMPTY, Doubles.EMPTY, Doubles.ERROR_NA,
                            Doubles.EMPTY));
            LocalTable actual = ExcelInputParser.parseExcelInput(stream, metadata, columnNames);

            assertThat(actual)
                    .usingComparatorForType(Comparator.comparingLong(Double::doubleToRawLongBits), Double.class)
                    .usingRecursiveComparison()
                    .isEqualTo(expected);
        }
    }

    @Test
    void testParseEmptyExcelInput() throws IOException {
        ExcelInputMetadata.ExcelTable metadata = new ExcelInputMetadata.ExcelTable(
                "Sheet2",
                -1,
                -1,
                List.of());

        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            LocalTable expected = LocalTable.ZERO;
            LocalTable actual = ExcelInputParser.parseExcelInput(stream, metadata, List.of());

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testParseEmptyTableExcelInput() throws IOException {
        ExcelInputMetadata.ExcelTable metadata = new ExcelInputMetadata.ExcelTable(
                "Sheet3",
                -1,
                -1,
                List.of(new ColumnMetadata("Column1", 0, InputColumnType.DOUBLE)));

        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            LocalTable expected = new LocalTable(new DoubleDirectColumn());
            LocalTable actual = ExcelInputParser.parseExcelInput(stream, metadata, List.of("Column1"));

            assertThat(actual)
                    .usingRecursiveComparison()
                    .isEqualTo(expected);
        }
    }

    @Test
    void testReadCatalog() throws IOException {
        ExcelCatalog expected = new ExcelCatalog(
                List.of("Sheet1", "Sheet2", "Sheet3"), List.of("Table1", "Table3", "Table4"));
        try (InputStream stream = getClass().getResourceAsStream("/inputs/test.xlsx")) {
            ExcelCatalog actual = ExcelInputParser.readCatalog(stream);

            assertThat(actual).isEqualTo(expected);
        }
    }

    @Test
    void testLoadWorkbook() throws IOException {
        ExcelWorkbook expected = new ExcelWorkbook(List.of(
                new ExcelWorkbook.Sheet(
                        "Sheet1",
                        Map.of(),
                        new Int2ObjectOpenHashMap<>(Map.of(
                                1, new ExcelWorkbook.ColumnData(1, List.of("1")),
                                2, new ExcelWorkbook.ColumnData(2, List.of("2/25/26")),
                                4, new ExcelWorkbook.ColumnData(4, List.of("#DIV/0!")),
                                5, new ExcelWorkbook.ColumnData(5, List.of("TRUE"))))),
                new ExcelWorkbook.Sheet(
                        "Sheet 2",
                        Map.of(
                                "Table1", new Range(1, 4, 1, 3),
                                "Table2", new Range(6, 7, 1, 3)),
                        new Int2ObjectOpenHashMap<>(Map.of(
                                1, new ExcelWorkbook.ColumnData(1, Arrays.asList("a", "1", null, null, null, "3")),
                                2, new ExcelWorkbook.ColumnData(1, Arrays.asList("b", "2", null, null, null, "4")))))));
        try (InputStream stream = getClass().getResourceAsStream("/inputs/preview.xlsx")) {
            ExcelWorkbook actual = ExcelInputParser.loadWorkbook(stream);

            assertThat(actual).isEqualTo(expected);
        }
    }
}