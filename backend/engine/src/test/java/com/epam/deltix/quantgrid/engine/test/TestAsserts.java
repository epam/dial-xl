package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.spark.SchemaUtil;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.types.DataTypes;
import org.apache.spark.sql.types.StructField;
import org.junit.jupiter.api.Assertions;

import java.util.Arrays;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

@UtilityClass
public class TestAsserts {

    public static void verify(DoubleColumn column, double... expected) {
        verify(column, new DoubleDirectColumn(expected));
    }

    private static void verify(DoubleColumn actual, DoubleColumn expected) {
        double[] actualArray = actual.toArray();
        double[] expectedArray = expected.toArray();
        Assertions.assertArrayEquals(actualArray, expectedArray,
                "Expected array %s, but got %s".formatted(Arrays.toString(expectedArray), Arrays.toString(actualArray))
        );
    }

    public static void verify(StringColumn column, String... expected) {
        verify("Expected array %s, but got %s", column, expected);
    }

    public static void verify(String message, StringColumn column, String... expected) {
        verify(message, column.toArray(), expected);
    }

    private static void verify(String message, String[] actual, String[] expected) {
        Assertions.assertArrayEquals(expected, actual,
                message.formatted(Arrays.toString(expected), Arrays.toString(actual)));
    }

    public static void verify(PeriodSeriesColumn column, PeriodSeries... expected) {
        Assertions.assertEquals(expected.length, column.size());
        for (int i = 0; i < expected.length; i++) {
            PeriodSeries expect = expected[i];
            PeriodSeries actual = column.get(i);

            if (expect == null && actual == null) {
                return;
            }

            Assertions.assertEquals(expect.getPeriod(), actual.getPeriod());
            Assertions.assertEquals(expect.getOffset(), actual.getOffset());
            verify(actual.getValues(), expect.getValues());
        }
    }

    public static void verify(Dataset<Row> dataset, String expected) {
        verify(dataset, true, expected);
    }

    public static void verifyWithHeader(Dataset<Row> dataset, String expected) {
        verify(dataset, false, expected);
    }

    private static void verify(Dataset<Row> dataset, boolean skipHeader, String expected) {
        dataset.explain();
        String actual = dataset.showString(1000, 0, false);

        if (skipHeader) {
            int dataLine = 0;
            for (int i = 0; i < 2; i++) {
                dataLine = actual.indexOf('\n', dataLine) + 1;
            }
            actual = actual.substring(dataLine);
        }

        Assertions.assertEquals(expected, actual);
        assertThat(dataset.columns()).doesNotHaveDuplicates();
    }

    public static void verify(Dataset<Row> result, List<Row> expected) {
        verify(result, expected.toArray(Row[]::new));
    }

    public static void verify(Dataset<Row> result, Row... expected) {
        result.show(false);
        List<Row> rows = result.collectAsList();
        assertThat(rows).containsExactly(expected);
        assertThat(result.columns()).doesNotHaveDuplicates();
    }

    public static Row row(Object... values) {
        return new GenericRow(values);
    }

    public static StructField field(String name, ColumnType type) {
        return DataTypes.createStructField(name, SchemaUtil.sparkDataType(type), SchemaUtil.isNullable(type));
    }
}
