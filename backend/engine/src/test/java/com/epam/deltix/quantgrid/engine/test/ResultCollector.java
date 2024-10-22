package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.ResultListener;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.TableKey;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;
import org.junit.jupiter.api.Assertions;

import java.util.concurrent.ConcurrentHashMap;

@Getter
public class ResultCollector implements ResultListener {
    private final ConcurrentHashMap<ParsedKey, ResultType> types = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<ParsedKey, Table> values = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<ParsedKey, String> errors = new ConcurrentHashMap<>();

    @Override
    public void onSimilaritySearch(FieldKey key, Table searchResult, @Nullable String error) { }

    @Override
    public void onUpdate(ParsedKey key,
                         long start,
                         long end,
                         boolean content,
                         Table value,
                         String error,
                         ResultType resultType) {
        if (error != null) {
            errors.put(key, error);
        } else {
            values.put(key, value);
            types.put(key, resultType);
        }
    }

    private StringColumn getString(ParsedKey key) {
        return getValue(key).getStringColumn(0);
    }

    private PeriodSeriesColumn getPeriodSeries(ParsedKey key) {
        return getValue(key).getPeriodSeriesColumn(0);
    }

    private void verify(ParsedKey key, double... expected) {
        StringColumn actual = getString(key);
        ColumnType type = getType(key).columnType();

        if (type == null) {
            type = ColumnType.INTEGER;
        }

        DoubleColumn numbers = new DoubleDirectColumn(expected);
        StringColumn texts = Text.text(numbers, type, null);

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

    ResultType getType(ParsedKey key) {
        ResultType type = types.get(key);
        Assertions.assertNotNull(type, "No type found for: " + key);
        return type;
    }
}
