package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.service.input.ColumnMetadata;
import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.ParserException;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class TestCsvInputParser {

    @Test
    void testInvalidCsvSchemaInference() throws IOException {
        byte[] csvBytes = """
                a, b, c
                1, 2, 4
                5, 6, 7, , 8
                4, 5
                7, 8, 6
                """.getBytes();

        CsvInputMetadata.CsvTable schemaWithExtraHeaders = CsvInputParser.inferSchema(new ByteArrayInputStream(csvBytes), true);
        CsvInputMetadata.CsvTable schemaNoExtraHeaders = CsvInputParser.inferSchema(new ByteArrayInputStream(csvBytes), false);

        assertThat(schemaWithExtraHeaders).isEqualTo(
                new CsvInputMetadata.CsvTable(List.of(
                        new ColumnMetadata("a", 0, InputColumnType.DOUBLE),
                        new ColumnMetadata("b", 1, InputColumnType.DOUBLE),
                        new ColumnMetadata("c", 2, InputColumnType.DOUBLE),
                        new ColumnMetadata("Column5", 4, InputColumnType.DOUBLE))));
        assertThat(schemaNoExtraHeaders).isEqualTo(
                new CsvInputMetadata.CsvTable(List.of(
                        new ColumnMetadata("a", 0, InputColumnType.DOUBLE),
                        new ColumnMetadata("b", 1, InputColumnType.DOUBLE),
                        new ColumnMetadata("c", 2, InputColumnType.DOUBLE))));
    }

    @Test
    void testParsingNonUtf8Chars() throws IOException {
        String csv = """
                country,date,GDP,IR
                USA,2021-01-01,21060,
                China,2021-01-01,14688,0.1
                EU,2021-01-01,13085,7
                """;

        byte[] bytesCsv = csv.getBytes();
        // replace "S" in "USA" with negative byte value
        bytesCsv[21] = -100;

        CsvInputMetadata.CsvTable actualMeta =
                CsvInputParser.inferSchema(new ByteArrayInputStream(bytesCsv), false);

        CsvInputMetadata.CsvTable expectedMeta = new CsvInputMetadata.CsvTable(List.of(
                new ColumnMetadata("country", 0, InputColumnType.STRING),
                new ColumnMetadata("date", 1, InputColumnType.DATE),
                new ColumnMetadata("GDP", 2, InputColumnType.DOUBLE),
                new ColumnMetadata("IR", 3, InputColumnType.DOUBLE)));

        Assertions.assertEquals(expectedMeta, actualMeta);

        LocalTable actualData = CsvInputParser.parseCsvInput(
                new ByteArrayInputStream(bytesCsv),
                null,
                actualMeta.columns().stream()
                        .map(ColumnMetadata::name)
                        .toList(),
                actualMeta.columns().stream()
                        .map(ColumnMetadata::type)
                        .toList());

        LocalTable expectedData = new LocalTable(
                new StringDirectColumn("U�A", "China", "EU"),
                new DoubleDirectColumn(44197, 44197, 44197),
                new DoubleDirectColumn(21060, 14688, 13085),
                new DoubleDirectColumn(Double.NaN, 0.1, 7));
        assertThat(actualData)
                .usingComparatorForType(Comparator.comparingLong(Double::doubleToRawLongBits), Double.class)
                .usingRecursiveComparison()
                .isEqualTo(expectedData);
    }

    @Test
    void testCustomNumbers() throws IOException {
        String csv = """
                a
                "-1,234,567.89"
                12.3M
                1K
                -2.3B
                """;

        CsvInputMetadata.CsvTable meta = CsvInputParser.inferSchema(new ByteArrayInputStream(csv.getBytes()), false);
        assertThat(meta).isEqualTo(
                new CsvInputMetadata.CsvTable(List.of(new ColumnMetadata("a", 0, InputColumnType.DOUBLE))));

        LocalTable actualData = CsvInputParser.parseCsvInput(
                new ByteArrayInputStream(csv.getBytes()), null, List.of("a"), List.of(InputColumnType.DOUBLE));

        LocalTable expectedData = new LocalTable(new DoubleDirectColumn(-1234567.89, 1.23E7, 1000.0, -2.3E9));
        assertThat(actualData)
                .usingRecursiveComparison()
                .isEqualTo(expectedData);
    }

    @Test
    void testMixedLineEnding() throws IOException {
        byte[] csvBytes = "a,b\r\n1,2\n3,4".getBytes();

        CsvInputMetadata.CsvTable meta = CsvInputParser.inferSchema(new ByteArrayInputStream(csvBytes), true);
        assertThat(meta).isEqualTo(
                new CsvInputMetadata.CsvTable(List.of(
                        new ColumnMetadata("a", 0, InputColumnType.DOUBLE),
                        new ColumnMetadata("b", 1, InputColumnType.STRING),
                        new ColumnMetadata("Column3", 2, InputColumnType.DOUBLE))));

        LocalTable actualData = CsvInputParser.parseCsvInput(
                new ByteArrayInputStream(csvBytes),
                List.of(0, 1, 2),
                null,
                List.of(InputColumnType.DOUBLE, InputColumnType.STRING, InputColumnType.DOUBLE));

        LocalTable expectedData = new LocalTable(
                new DoubleDirectColumn(1),
                new StringDirectColumn("2\n3"),
                new DoubleDirectColumn(4));
        assertThat(actualData)
                .usingRecursiveComparison()
                .isEqualTo(expectedData);
    }

    @Test
    void testMaxColumnsIsExceeded() {
        String csv = IntStream.range(0, 513)
                .mapToObj(i -> "Column" + i)
                .collect(Collectors.joining(","));
        InputStream stream = new ByteArrayInputStream(csv.getBytes());
        assertThatExceptionOfType(ParserException.class)
                .isThrownBy(() -> CsvInputParser.inferSchema(stream, false))
                .withMessage("The document exceeds the maximum column count of 512.");
    }

    @Test
    void testMaxColumnValueIsExceeded() {
        String csv = "a," + Stream.generate(() -> "b")
                .limit(1_048_577)
                .collect(Collectors.joining());
        InputStream stream = new ByteArrayInputStream(csv.getBytes());
        assertThatExceptionOfType(ParserException.class)
                .isThrownBy(() -> CsvInputParser.inferSchema(stream, false))
                .withMessage("Value exceeds max size of 1048576 at column number 2, row 1.");
    }
}
