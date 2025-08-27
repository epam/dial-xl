package com.epam.deltix.quantgrid.engine.service.input.storage.results;

import com.epam.deltix.quantgrid.engine.store.StoreUtils;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import org.assertj.core.api.InstanceOfAssertFactories;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class StoreUtilsTest {
    private static final String[] STRINGS = {"test", "example", Strings.ERROR_NA, Strings.EMPTY, "5", "\"\""};
    private static final double[] DOUBLES = {0.0, -0.0, 123, -123, Doubles.ERROR_NA, Doubles.EMPTY};
    public static final String CSV = """
            "test",0
            "example",-9223372036854775808
            ,4638355772470722560
            "",-4585016264384053248
            "5",9221120237041090561
            \"""\""",9221120237041090560
            """;

    @Test
    void testRead() throws IOException {
        List<ColumnType> columnTypes = List.of(ColumnType.STRING, ColumnType.DOUBLE);
        try (InputStream stream = new ByteArrayInputStream(CSV.getBytes())) {
            Table table = StoreUtils.readTable(stream, columnTypes);

            assertThat(table.getColumnCount()).isEqualTo(2);
            assertThat(table.getColumn(0))
                    .asInstanceOf(InstanceOfAssertFactories.type(StringColumn.class))
                    .extracting(StringColumn::toArray)
                    .isEqualTo(STRINGS);
            assertThat(table.getColumn(1))
                    .asInstanceOf(InstanceOfAssertFactories.type(DoubleColumn.class))
                    .extracting(DoubleColumn::toArray)
                    .isEqualTo(DOUBLES);
        }
    }

    @Test
    void testWrite() throws IOException {
        Table table = new LocalTable(
                new StringDirectColumn(STRINGS),
                new DoubleDirectColumn(DOUBLES));
        try (ByteArrayOutputStream stream = new ByteArrayOutputStream()) {
            StoreUtils.writeTable(stream, table);

            assertThat(stream.toString()).isEqualToNormalizingNewlines(CSV);
        }
    }
}