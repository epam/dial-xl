package com.epam.quantgrid.input.csv;

import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.quantgrid.input.api.DataRow;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class CsvStreamTest {
    @Test
    void testIteration() throws Exception {
        List<ColumnType> types = List.of(ColumnType.DOUBLE, ColumnType.STRING);
        LocalTable table = new LocalTable(
                List.of(new DoubleDirectColumn(1.0, 2.0, 3.0), new StringDirectColumn("a", "b", "c")));
        try (CsvStream stream = new CsvStream(types, table)) {
            DataRow next = stream.next();

            assertThat(next.toString()).isEqualTo(
                    "DataRow(columnTypes=[DOUBLE, STRING], strings=[null, a], doubles=[1.0, 0.0])");
            assertThat(next.getDouble(0)).isEqualTo(1.0);
            assertThat(next.getString(1)).isEqualTo("a");
            assertThat(stream.next()).isEqualTo(next);
            assertThat(next.getDouble(0)).isEqualTo(2.0);
            assertThat(next.getString(1)).isEqualTo("b");
            assertThat(stream.next()).isEqualTo(next);
            assertThat(next.getDouble(0)).isEqualTo(3.0);
            assertThat(next.getString(1)).isEqualTo("c");
            assertThat(stream.next()).isNull();
        }
    }
}