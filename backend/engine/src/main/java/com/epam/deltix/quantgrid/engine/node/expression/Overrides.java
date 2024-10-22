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
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.ArrayList;
import java.util.List;

public class Overrides extends ExpressionN<Column, Column> {

    private final Object[] overrideKeys; // for identity
    @NotSemantic
    private final TableIndex overrideIndex;

    public Overrides(List<Expression> searchKeys, Expression originalValues,
                     List<Object> overrideKeys, List<Expression> overrideValues) {
        super(sources(searchKeys, originalValues, overrideValues));
        this.overrideKeys = overrideKeys.toArray(new Object[0]);

        TableHashStrategy overrideStrategy = TableHashStrategy.fromColumns(toColumns(this.overrideKeys), false, false);
        overrideIndex = TableIndex.build(overrideValues.size(), overrideStrategy);
    }

    @Override
    public ColumnType getType() {
        return expression(overrideKeys.length).getType();
    }

    @Override
    protected Column evaluate(List<Column> columns) {
        List<Column> searchKeys = columns.subList(0, overrideKeys.length);
        Column originalValues = columns.get(overrideKeys.length);
        List<Column> overrideValues = columns.subList(overrideKeys.length + 1, columns.size());
        TableHashStrategy searchStrategy = TableHashStrategy.fromColumns(searchKeys, overrideIndex.strategy(), false, false);

        if (originalValues instanceof DoubleColumn originalDoubles) {
            return override(originalDoubles, overrideValues, searchStrategy);
        }

        if (originalValues instanceof StringColumn strings) {
            return override(strings, overrideValues, searchStrategy);
        }

        throw new IllegalArgumentException("Unsupported column type: " + originalValues.getClass());
    }

    private DoubleLambdaColumn override(DoubleColumn originalValues,
                                        List<Column> overrideValues,
                                        TableHashStrategy searchStrategy) {
        double[] overrides = new double[overrideValues.size()];

        for (int i = 0; i < overrideValues.size(); i++) {
            DoubleColumn column = (DoubleColumn) overrideValues.get(i);
            Util.verify(column.size() == 1);
            overrides[i] = column.get(0);
        }

        return new DoubleLambdaColumn(row -> {
            int position = overrideIndex.first(row, searchStrategy);
            if (position == TableIndex.MISSING) {
                return originalValues.get(row);
            }

            int index = (int) overrideIndex.value(position);
            return overrides[index];
        }, originalValues.size());
    }

    private StringLambdaColumn override(StringColumn originalValues,
                                        List<Column> overrideValues,
                                        TableHashStrategy searchStrategy) {
        String[] overrides = new String[overrideValues.size()];

        for (int i = 0; i < overrideValues.size(); i++) {
            StringColumn column = (StringColumn) overrideValues.get(i);
            Util.verify(column.size() == 1);
            overrides[i] = column.get(0);
        }

        return new StringLambdaColumn(row -> {
            int position = overrideIndex.first(row, searchStrategy);
            if (position == TableIndex.MISSING) {
                return originalValues.get(row);
            }

            int index = (int) overrideIndex.value(position);
            return overrides[index];
        }, originalValues.size());
    }

    private static List<Column> toColumns(Object[] overrideKeys) {
        List<Column> columns = new ArrayList<>(overrideKeys.length);

        for (Object array : overrideKeys) {
            Column column = toColumn(array);
            columns.add(column);
        }

        return columns;
    }

    private static Column toColumn(Object array) {
        if (array instanceof double[] doubles) {
            return new DoubleDirectColumn(doubles);
        }

        if (array instanceof String[] strings) {
            return new StringDirectColumn(strings);
        }

        throw new IllegalArgumentException("Unsupported type: " + array.getClass());
    }

    private static List<Expression> sources(List<Expression> searchKeys,
                                            Expression originalValues,
                                            List<Expression> overrideValues) {
        List<Expression> sources = new ArrayList<>(searchKeys);
        sources.add(originalValues);
        sources.addAll(overrideValues);
        return sources;
    }
}
