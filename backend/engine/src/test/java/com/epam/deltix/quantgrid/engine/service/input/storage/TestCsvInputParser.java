package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.type.InputColumnType;
import com.epam.deltix.quantgrid.util.ParserException;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatExceptionOfType;

class TestCsvInputParser {

    @Test
    void testInvalidCsvSchemaInference() {
        String csv = """
                a, b, c, ,
                1, 2, 4
                5, 6, 7, , 8
                4, 5
                7, 8, 6
                """;
        List<String> expectedNames = List.of("a", "b", "c", "Column4", "Column5");
        List<InputColumnType> expectedTypes = Arrays.asList(
                InputColumnType.DOUBLE, InputColumnType.DOUBLE, InputColumnType.DOUBLE, null, InputColumnType.DOUBLE);

        Reader csvReader = new StringReader(csv);
        LinkedHashMap<String, InputColumnType> schema = CsvInputParser.inferSchema(csvReader);

        Assertions.assertEquals(expectedNames, new ArrayList<>(schema.keySet()));
        Assertions.assertEquals(expectedTypes, new ArrayList<>(schema.values()));
    }

    @Test
    void testParsingNonUtf8Chars() {
        String csv = """
                country,date,GDP,IR
                USA,2021-01-01,21060,
                China,2021-01-01,14688,0.1
                EU,2021-01-01,13085,7
                """;

        byte[] bytesCsv = csv.getBytes();
        // replace "S" in "USA" with negative byte value
        bytesCsv[21] = -100;

        LinkedHashMap<String, InputColumnType> schema =
                CsvInputParser.inferSchema(new InputStreamReader(new ByteArrayInputStream(bytesCsv)));

        LinkedHashMap<String, InputColumnType> expectedSchema = new LinkedHashMap<>();
        expectedSchema.put("country", InputColumnType.STRING);
        expectedSchema.put("date", InputColumnType.DATE);
        expectedSchema.put("GDP", InputColumnType.DOUBLE);
        expectedSchema.put("IR", InputColumnType.DOUBLE);

        Assertions.assertEquals(expectedSchema, schema);

        Object[] data = CsvInputParser.parseCsvInput(new InputStreamReader(new ByteArrayInputStream(bytesCsv)),
                schema.keySet().stream().toList(), schema);

        Assertions.assertIterableEquals(ObjectArrayList.of("U�A", "China", "EU"), (ObjectArrayList<String>) data[0]);
        Assertions.assertIterableEquals(DoubleArrayList.of(44197, 44197, 44197), (DoubleArrayList) data[1]);
        Assertions.assertIterableEquals(DoubleArrayList.of(21060, 14688, 13085), (DoubleArrayList) data[2]);
        Assertions.assertIterableEquals(DoubleArrayList.of(Double.NaN, 0.1, 7), (DoubleArrayList) data[3]);
    }

    @Test
    void testCustomNumbers() {
        String csv = """
                a
                "-1,234,567.89"
                12.3M
                1K
                -2.3B
                """;

        LinkedHashMap<String, InputColumnType> schema = CsvInputParser.inferSchema(new StringReader(csv));
        assertThat(List.copyOf(schema.keySet())).isEqualTo(List.of("a"));
        assertThat(List.copyOf(schema.values())).isEqualTo(List.of(InputColumnType.DOUBLE));

        Object[] content = CsvInputParser.parseCsvInput(new StringReader(csv), List.copyOf(schema.keySet()), schema);
        assertThat(content).isEqualTo(new Object[] {
                new DoubleArrayList(new double[] {-1234567.89, 1.23E7, 1000.0, -2.3E9})
        });
    }

    @Test
    void testMixedLineEnding() {
        String csv = "a,b\r\n1,2\n3,4";

        LinkedHashMap<String, InputColumnType> schema = CsvInputParser.inferSchema(new StringReader(csv));
        assertThat(List.copyOf(schema.keySet()))
                .isEqualTo(List.of("a", "b", "Column3"));
        assertThat(List.copyOf(schema.values()))
                .isEqualTo(List.of(InputColumnType.DOUBLE, InputColumnType.STRING, InputColumnType.DOUBLE));

        Object[] content = CsvInputParser.parseCsvInput(new StringReader(csv), List.copyOf(schema.keySet()), schema);
        assertThat(content).isEqualTo(new Object[] {
                new DoubleArrayList(new double[] {1}),
                new ObjectArrayList<>(new String[] {"2\n3"}),
                new DoubleArrayList(new double[] {4})
        });
    }

    @Test
    void testMaxColumnsIsExceeded() {
        String csv = IntStream.range(0, 513)
                .mapToObj(i -> "Column" + i)
                .collect(Collectors.joining(","));
        StringReader reader = new StringReader(csv);
        assertThatExceptionOfType(ParserException.class)
                .isThrownBy(() -> CsvInputParser.inferSchema(reader))
                .withMessage("The document exceeds the maximum column count of 512.");
    }

    @Test
    void testMaxColumnValueIsExceeded() {
        String csv = "a," + Stream.generate(() -> "b")
                .limit(1_048_577)
                .collect(Collectors.joining());
        StringReader reader = new StringReader(csv);
        assertThatExceptionOfType(ParserException.class)
                .isThrownBy(() -> CsvInputParser.inferSchema(reader))
                .withMessage("Value exceeds max size of 1048576 at column number 2, row 1.");
    }
}
