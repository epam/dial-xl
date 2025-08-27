package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.compiler.Compilation;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.TableKey;
import com.epam.deltix.quantgrid.parser.TotalKey;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.junit.jupiter.api.Assertions;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.ConcurrentHashMap;

@Getter
public class ResultCollector implements ResultListener {
    private final Map<FieldKey, Integer> positions = new HashMap<>();
    private final ConcurrentHashMap<ParsedKey, Table> values = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<FieldKey, Table> indices = new ConcurrentHashMap<>();
    @Getter
    private final ConcurrentHashMap<ParsedKey, String> errors = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<Trace, Integer> traces = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<FieldKey, String> indexErrors = new ConcurrentHashMap<>();

    @Override
    public void onParsing(List<ParsedSheet> sheets) {
        positions.clear();
        for (ParsedSheet sheet : sheets) {
            for (ParsedTable table : sheet.tables()) {
                int position = 1;
                for (ParsedFields fields : table.fields()) {
                    for (ParsedField field : fields.fields()) {
                        positions.put(new FieldKey(table.tableName(), field.fieldName()), position++);
                    }
                }
            }
        }
    }

    @Override
    public void onCompilation(Compilation compilation) {
        compilation.errors().forEach((key, error) -> {
            onUpdate(key, -1, -1, true, false, null, error.getMessage(), null);
        });
    }

    @Override
    public void onUpdate(ParsedKey key,
                         long start,
                         long end,
                         boolean content,
                         boolean raw,
                         Table value,
                         String error,
                         ResultType resultType) {
        if (value == null) {
            errors.put(key, error);
        } else {
            values.put(key, value);
        }
    }

    @Override
    public void onIndex(FieldKey key, Table value, String error) {
        if (error != null) {
            indexErrors.put(key, error);
        } else {
            indices.put(key, value);
        }
    }

    @Override
    public void onProfile(Trace trace, long startedAt, long stoppedAt, boolean completed) {
        int delta = completed ? -1 : 1;
        int count = traces.compute(trace, (key, value) -> (value == null) ? delta : (value + delta));
        Assertions.assertTrue(count >= 0);
    }

    private StringColumn getString(ParsedKey key) {
        return getValue(key).getStringColumn(0);
    }

    private PeriodSeriesColumn getPeriodSeries(ParsedKey key) {
        return getValue(key).getPeriodSeriesColumn(0);
    }

    private void verify(ParsedKey key, double... expected) {
        StringColumn actual = getString(key);

        DoubleColumn numbers = new DoubleDirectColumn(expected);
        StringColumn texts = Text.text(numbers, GeneralFormat.INSTANCE);

        TestAsserts.verify(actual, texts.toArray());
    }

    private void verify(ParsedKey key, String... expected) {
        StringColumn actual = getString(key);
        TestAsserts.verify(key + ": expected array %s, but got %s", actual, expected);
    }

    private void verify(ParsedKey key, PeriodSeries... expected) {
        PeriodSeriesColumn actual = getPeriodSeries(key);
        TestAsserts.verify(actual, expected);
    }

    public void verify(String table, String field) {
        verify(table, field, new String[0]);
    }

    public void verify(String table, String field, String... expected) {
        verify(new FieldKey(table, field), expected);
    }

    public void verify(String table, String field, double... expected) {
        verify(new FieldKey(table, field), expected);
    }

    public void verify(String table, String field, PeriodSeries... expected) {
        verify(new FieldKey(table, field), expected);
    }

    public void verifyError(String table, String field, String error) {
        String actual = getError(table, field);
        Assertions.assertEquals(error, actual);
    }

    public String getError(String tableName, String fieldName) {
        return errors.get(fieldName == null ? new TableKey(tableName) : new FieldKey(tableName, fieldName));
    }

    public void verifyTotal(String table, String field, int number, String... expected) {
        verify(new TotalKey(table, field, number), expected);
    }

    public void verifyTotal(String table, String field, int number, double... expected) {
        verify(new TotalKey(table, field, number), expected);
    }

    public void verifyTotalError(String table, String field, int number, String error) {
        String actual = errors.get(new TotalKey(table, field, number));
        Assertions.assertEquals(error, actual);
    }

    public void verifyOverrideError(String table, String field, int number, String error) {
        String actual = errors.get(new OverrideKey(table, field, number));
        Assertions.assertEquals(error, actual);
    }

    public Set<FieldKey> getIndices() {
        return indices.keySet();
    }

    Table getValue(ParsedKey key) {
        String error = errors.get(key);
        if (error != null) {
            throw new RuntimeException(error);
        }

        Table result = values.get(key);
        if (result == null) {
            throw new IllegalStateException("No value found for %s".formatted(key));
        }

        return result;
    }

    public void verify(String expected) {
        String actual = text();
        Assertions.assertEquals(expected, actual, "Results do not match");
    }

    private String text(String table) {
        Tab tab = new Tab(table);

        for (Map.Entry<ParsedKey, Table> entry : values.entrySet()) {
            ParsedKey key = entry.getKey();
            if (key instanceof FieldKey field && field.tableName().equals(table)) {
                tab.columns.add(new Col(field.fieldName(), positions.get(field), getString(field)));
            }
        }

        for (Map.Entry<ParsedKey, String> entry : errors.entrySet()) {
            ParsedKey key = entry.getKey();
            if (key.table().equals(table)) {
                tab.errors.add(new Err(key, entry.getValue()));
            }
        }

        return tab.text();
    }

    public void show() {
        System.out.println(text());
    }

    public String text() {
        StringBuilder builder = new StringBuilder();
        Set<String> tables = new TreeSet<>();
        values.keySet().forEach(key -> tables.add(key.table()));
        errors.keySet().forEach(key -> tables.add(key.table()));

        for (String table : tables) {
            if (!builder.isEmpty()) {
                builder.append("\n");
            }

            String text = text(table);
            builder.append(text);
        }

        return builder.toString();
    }

    public void verifyTraces() {
        traces.forEach((trace, count) -> {
            Assertions.assertEquals(0, count, "Trace: " + trace + " has not completed: " + count);
        });
    }

    @RequiredArgsConstructor
    private static class Tab {
        private final String name;
        private final Set<Col> columns = new TreeSet<>();
        private final Set<Err> errors = new TreeSet<>();

       public String text() {
            StringBuilder builder = new StringBuilder();
            builder.append("Table: ").append(name).append("\n");

            if (!columns.isEmpty()) {
                columns(builder);
            }

            if (!errors.isEmpty()) {
                errors(builder);
            }

            return builder.toString();
        }

        private void columns(StringBuilder builder) {
            header(builder);
            rows(builder);
            trailer(builder);
        }

        private void header(StringBuilder builder) {
            line(builder);
            for (Col column : columns) {
                builder.append(column.template.formatted(column.name));
            }
            builder.append("|\n");
            line(builder);
        }

        private void rows(StringBuilder builder) {
            long rows = columns.stream().map(Col::rows).reduce(0L, Long::max);
            for (long row = 0; row < rows; row++) {
                for (Col column : columns) {
                    builder.append(column.template.formatted(column.get(row)));
                }
                builder.append("|\n");
            }
        }

        private void trailer(StringBuilder builder) {
            line(builder);
        }

        private void line(StringBuilder builder) {
            for (Col column : columns) {
                builder.append("+").append("-".repeat(column.width));
            }
            builder.append("+").append("\n");
        }

        private void errors(StringBuilder builder) {
            int width = errors.stream().map(err -> err.key.toString().length()).reduce(0, Integer::max);
            for (Err error : errors) {
                String text = ("ERR >> %-" + width + "s - %s").formatted(error.key, error.error);
                builder.append(text).append("\n");
            }
        }
    }

    private static class Col implements Comparable<Col> {
        final String name;
        final int position;
        final StringColumn column;
        final int width;
        final String template;

        public Col(String name, int position, StringColumn column) {
            this.name = name;
            this.position = position;
            this.column = column;
            this.width = width() + 2;
            this.template = "| %" + (width - 2) + "s ";
        }

        @Override
        public int compareTo(Col other) {
            return Integer.compare(position, other.position);
        }

        long rows() {
            return column.size();
        }

        String get(long i) {
            if (i >= column.size()) {
                return "-"; // pivot thing, pivot size is different
            }

            String value = column.get(i);
            return value == null ? "NA" : value;
        }

        int width() {
            int width = name.length();
            for (int i = 0; i < column.size(); i++) {
                width = Math.max(width, get(i).length());
            }
            return width;
        }
    }

    private static class Err implements Comparable<Err> {
        private final ParsedKey key;
        private final String error;

        public Err(ParsedKey key, String error) {
            this.key = key;
            this.error = error;
        }

        @Override
        public int compareTo(@NotNull ResultCollector.Err o) {
            int cmp = Integer.compare(type(key), type(o.key));
            return cmp == 0 ? key.toString().compareTo(o.key.toString()) : cmp;
        }

        private int type(ParsedKey key) {
            if (key instanceof TableKey) {
                return 1;
            }

            if (key instanceof FieldKey) {
                return 2;
            }

            if (key instanceof TotalKey) {
                return 3;
            }

            if (key instanceof OverrideKey) {
                return 4;
            }

            throw new IllegalArgumentException("Unsupported type: " + key.getClass());
        }
    }
}
