package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class IsNa extends Expression1<Column, Column> {

    public IsNa(Expression source) {
        super(source);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.BOOLEAN;
    }

    @Override
    protected Column evaluate(Column source) {
        if (source instanceof DoubleColumn values) {
            return new DoubleLambdaColumn(index -> Util.isNa(values.get(index)) ? 1.0 : 0.0, values.size());
        }

        if (source instanceof StringColumn values) {
            return new DoubleLambdaColumn(index -> Util.isNa(values.get(index)) ? 1.0 : 0.0, values.size());
        }

        if (source instanceof PeriodSeriesColumn values) {
            return new DoubleLambdaColumn(index -> Util.isNa(values.get(index)) ? 1.0 : 0.0, values.size());
        }

        throw new IllegalArgumentException("Unsupported argument type: " + source.getClass());
    }
}
