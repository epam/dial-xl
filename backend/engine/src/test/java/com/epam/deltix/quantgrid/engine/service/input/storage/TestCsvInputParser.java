package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.InputStreamReader;
import java.io.Reader;
import java.io.StringReader;
import java.util.LinkedHashMap;

class TestCsvInputParser {

    @Test
    void testInvalidCsvSchemaInference() {
        String csv = """
                a, b, c
                1, 2, 4
                5, 6, 7
                4, 5
                7, 8, 6
                """;
        Reader csvReader = new StringReader(csv);

        RuntimeException exception =
                Assertions.assertThrows(RuntimeException.class, () -> CsvInputParser.inferSchema(csvReader));
        Assertions.assertEquals("Expected 3 values per row, but was: 2", exception.getMessage());
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

        LinkedHashMap<String, ColumnType> schema =
                CsvInputParser.inferSchema(new InputStreamReader(new ByteArrayInputStream(bytesCsv)));

        LinkedHashMap<String, ColumnType> expectedSchema = new LinkedHashMap<>();
        expectedSchema.put("country", ColumnType.STRING);
        expectedSchema.put("date", ColumnType.DATE);
        expectedSchema.put("GDP", ColumnType.DOUBLE);
        expectedSchema.put("IR", ColumnType.DOUBLE);

        Assertions.assertEquals(schema, expectedSchema);

        Object[] data = CsvInputParser.parseCsvInput(new InputStreamReader(new ByteArrayInputStream(bytesCsv)),
                schema.keySet().stream().toList(), schema);

        Assertions.assertIterableEquals(ObjectArrayList.of("U�A", "China", "EU"), (ObjectArrayList<String>) data[0]);
        Assertions.assertIterableEquals(DoubleArrayList.of(44197, 44197, 44197), (DoubleArrayList) data[1]);
        Assertions.assertIterableEquals(DoubleArrayList.of(21060, 14688, 13085), (DoubleArrayList) data[2]);
        Assertions.assertIterableEquals(DoubleArrayList.of(Double.NaN, 0.1, 7), (DoubleArrayList) data[3]);
    }
}
