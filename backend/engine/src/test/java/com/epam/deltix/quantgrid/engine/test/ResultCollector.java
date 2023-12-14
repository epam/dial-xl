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
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import org.junit.jupiter.api.Assertions;

import java.util.concurrent.ConcurrentHashMap;

@Getter
public class ResultCollector implements ResultListener {
    private final ConcurrentHashMap<FieldKey, ResultType> types = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<FieldKey, Table> values = new ConcurrentHashMap<>();
    private final ConcurrentHashMap<FieldKey, String> errors = new ConcurrentHashMap<>();

    @Override
    public void onUpdate(String tableName,
                         String fieldName,
                         long start,
                         long end,
                         boolean content, long version,
                         Table value,
                         String error,
                         ResultType resultType) {
        FieldKey fieldKey = new FieldKey(tableName, fieldName);
        if (error != null) {
            errors.put(fieldKey, error);
        } else {
            values.put(fieldKey, value);
            types.put(fieldKey, resultType);
        }
    }

    private StringColumn getString(String tableName, String fieldName) {
        return getValue(tableName, fieldName).getStringColumn(0);
    }

    private PeriodSeriesColumn getPeriodSeries(String tableName, String fieldName) {
        return getValue(tableName, fieldName).getPeriodSeriesColumn(0);
    }

    public void verify(String table, String field, double... expected) {
        StringColumn actual = getString(table, field);
        ColumnType type = getType(table, field).columnType();

        if (type == null) {
            type = ColumnType.INTEGER;
        }

        DoubleColumn numbers = new DoubleDirectColumn(expected);
        StringColumn texts = Text.text(numbers, type, null);

        TestAsserts.verify(actual, texts);
    }

    public void verify(String table, String field) {
        verify(table, field, new String[0]);
    }

    public void verify(String table, String field, String... expected) {
        StringColumn actual = getString(table, field);
        TestAsserts.verify(actual, expected);
    }

    public void verify(String table, String field, PeriodSeries... expected) {
        PeriodSeriesColumn actual = getPeriodSeries(table, field);
        TestAsserts.verify(actual, expected);
    }

    public void verifyError(String table, String field, String error) {
        String actual = getError(table, field);
        Assertions.assertEquals(error, actual);
    }

    public String getError(String tableName, String fieldName) {
        return errors.get(new FieldKey(tableName, fieldName));
    }

    Table getValue(String tableName, String fieldName) {
        FieldKey fieldKey = new FieldKey(tableName, fieldName);

        String error = errors.get(fieldKey);
        if (error != null) {
            throw new RuntimeException(error);
        }

        Table result = values.get(fieldKey);
        if (result == null) {
            throw new IllegalStateException("No value found for %s[%s]".formatted(tableName, fieldName));
        }

        return result;
    }

    ResultType getType(String tableName, String fieldName) {
        FieldKey key = new FieldKey(tableName, fieldName);
        ResultType type = types.get(key);
        Assertions.assertNotNull(type, "No type found for: " + key);
        return type;
    }
}
