package com.epam.deltix.quantgrid.engine.store;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.DeduplicateSet;
import com.univocity.parsers.csv.Csv;
import com.univocity.parsers.csv.CsvParser;
import com.univocity.parsers.csv.CsvParserSettings;
import com.univocity.parsers.csv.CsvWriter;
import com.univocity.parsers.csv.CsvWriterSettings;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.io.InputStream;
import java.io.OutputStream;
import java.util.Arrays;
import java.util.List;
import java.util.function.Consumer;
import java.util.function.IntFunction;
import java.util.stream.IntStream;

@Slf4j
@UtilityClass
public class StoreUtils {
    private static final int MAX_COLUMNS = 100_000;

    public Table readTable(InputStream stream, List<ColumnType> columnTypes) {
        CsvParserSettings settings = Csv.parseRfc4180();
        settings.setLineSeparatorDetectionEnabled(true);
        settings.setMaxColumns(MAX_COLUMNS);
        settings.setMaxCharsPerColumn(-1);
        settings.setEmptyValue("");

        ColumnBuilder[] builders = columnTypes.stream()
                .map(StoreUtils::createColumnBuilder)
                .toArray(ColumnBuilder[]::new);

        CsvParser parser = new CsvParser(settings);
        for (String[] row : parser.iterate(stream)) {
            for (int i = 0; i < builders.length; i++) {
                builders[i].accept(row[i]);
            }
        }

        Column[] columns = Arrays.stream(builders)
                .map(ColumnBuilder::build)
                .toArray(Column[]::new);
        return new LocalTable(columns);
    }

    public void writeTable(OutputStream stream, Table table) {
        CsvWriterSettings settings = new CsvWriterSettings();
        settings.setMaxColumns(MAX_COLUMNS);
        settings.setMaxCharsPerColumn(-1);
        Integer[] quoteIndices = IntStream.range(0, table.getColumnCount())
                .filter(i -> table.getColumn(i) instanceof StringColumn)
                .boxed()
                .toArray(Integer[]::new);
        settings.quoteIndexes(quoteIndices);
        settings.setQuoteNulls(false); // to differentiate between null and empty string
        settings.setSkipEmptyLines(false);

        CsvWriter writer = new CsvWriter(stream, settings);
        String[] values = new String[table.getColumnCount()];
        ColumnSerializer[] serializers = Arrays.stream(table.getColumns())
                .map(StoreUtils::createColumnSerializer)
                .toArray(ColumnSerializer[]::new);

        for (int i = 0; i < table.size(); i++) {
            for (int j = 0; j < values.length; j++) {
                values[j] = serializers[j].apply(i);
            }

            writer.writeRow(values);
        }
        writer.flush();
    }

    private ColumnBuilder createColumnBuilder(ColumnType columnType) {
        return switch (columnType) {
            case DOUBLE -> new DoubleColumnBuilder();
            case STRING -> new StringColumnBuilder();
            default -> throw new UnsupportedOperationException("Unsupported column type: " + columnType);
        };
    }

    private ColumnSerializer createColumnSerializer(Column column) {
        if (column instanceof DoubleColumn doubleColumn) {
            return new DoubleColumnSerializer(doubleColumn);
        }

        if (column instanceof StringColumn stringColumn) {
            return stringColumn::get;
        }

        throw new UnsupportedOperationException("Unsupported column type: " + column.getClass());
    }

    private interface ColumnBuilder extends Consumer<String> {
        Column build();
    }

    private static class DoubleColumnBuilder implements ColumnBuilder {
        private final DoubleArrayList doubles = new DoubleArrayList();

        @Override
        public void accept(String s) {
            doubles.add(Double.longBitsToDouble(Long.parseLong(s)));
        }

        @Override
        public Column build() {
            return new DoubleDirectColumn(doubles);
        }
    }

    private static class StringColumnBuilder implements ColumnBuilder {
        private final ObjectArrayList<String> strings = new ObjectArrayList<>();
        DeduplicateSet<String> set = new DeduplicateSet<>();

        @Override
        public void accept(String s) {
            strings.add(set.add(s));
        }

        @Override
        public Column build() {
            return new StringDirectColumn(strings);
        }
    }

    private interface ColumnSerializer extends IntFunction<String> {
    }

    private record DoubleColumnSerializer(DoubleColumn values) implements ColumnSerializer {
        @Override
        public String apply(int index) {
            return String.valueOf(Double.doubleToRawLongBits(values.get(index)));
        }
    }
}
