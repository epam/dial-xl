package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableIndex;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.parser.ParsedOverride;
import com.epam.deltix.quantgrid.service.parser.OverrideValue;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.ArrayList;
import java.util.List;

public class Overrides extends ExpressionN<Column, Column> {

    private final Object[] keyOverrides; // for identity
    private final Object valueOverrides;
    @NotSemantic
    private final TableIndex mapping;

    public Overrides(Expression value,
                     List<Expression> keys,
                     ParsedOverride.TypedValue valueOverrides,
                     List<ParsedOverride.TypedValue> keyOverrides) {
        super(Util.listOf(value, keys));

        this.valueOverrides = toArray(value.getType(), valueOverrides);
        this.keyOverrides = toArrays(keys, keyOverrides);

        TableHashStrategy strategy = TableHashStrategy.fromColumns(toColumns(this.keyOverrides));
        mapping = TableIndex.build(valueOverrides.value().size(), strategy);
    }

    @Override
    public ColumnType getType() {
        return expression(0).getType();
    }

    @Override
    protected Column evaluate(List<Column> columns) {
        Column values = columns.get(0);
        List<Column> keys = columns.subList(1, columns.size()).stream().toList();

        TableIndex mapping = this.mapping;
        TableHashStrategy strategy = TableHashStrategy.fromColumns(keys, mapping.strategy());

        if (values instanceof DoubleColumn doubles) {
            return override(doubles, mapping, strategy, values);
        }

        if (values instanceof StringColumn strings) {
            return override(strings, mapping, strategy, values);
        }

        throw new IllegalArgumentException("Unsupported column type: " + values.getClass());
    }

    private DoubleLambdaColumn override(DoubleColumn doubles, TableIndex mapping,
                                        TableHashStrategy strategy, Column values) {
        double[] overrides = (double[]) valueOverrides;
        return new DoubleLambdaColumn(row -> {
            int position = mapping.first(row, strategy);
            if (position == TableIndex.MISSING) {
                return doubles.get(row);
            }

            int index = (int) mapping.value(position);
            return overrides[index];
        }, values.size());
    }

    private StringLambdaColumn override(StringColumn strings, TableIndex mapping,
                                        TableHashStrategy strategy, Column values) {
        String[] overrides = (String[]) valueOverrides;
        return new StringLambdaColumn(row -> {
            int position = mapping.first(row, strategy);
            if (position == TableIndex.MISSING) {
                return strings.get(row);
            }

            int index = (int) mapping.value(position);
            return overrides[index];
        }, values.size());
    }

    private static Object[] toArrays(List<Expression> keys, List<ParsedOverride.TypedValue> overrides) {
        Util.verify(keys.size() == overrides.size());
        Object[] arrays = new Object[keys.size()];

        for (int i = 0; i < keys.size(); i++) {
            ColumnType type = keys.get(i).getType();
            ParsedOverride.TypedValue override = overrides.get(i);
            arrays[i] = toArray(type, override);
        }

        return arrays;
    }

    private static List<Column> toColumns(Object[] arrays) {
        List<Column> columns = new ArrayList<>(arrays.length);

        for (Object array : arrays) {
            Column column = toColumn(array);
            columns.add(column);
        }

        return columns;
    }

    static Object toArray(ColumnType type, ParsedOverride.TypedValue override) {
        return switch (type) {
            case DOUBLE, INTEGER, BOOLEAN, DATE ->
                    override.value().stream().mapToDouble(OverrideValue::getDouble).toArray();
            case STRING -> override.value().stream().map(OverrideValue::getString).toArray(String[]::new);
            default -> throw new IllegalArgumentException("Unsupported type: " + type);
        };
    }

    static Column toColumn(Object array) {
        if (array instanceof double[] doubles) {
            return new DoubleDirectColumn(doubles);
        }

        if (array instanceof String[] strings) {
            return new StringDirectColumn(strings);
        }

        throw new IllegalArgumentException("Unsupported type: " + array.getClass());
    }
}
