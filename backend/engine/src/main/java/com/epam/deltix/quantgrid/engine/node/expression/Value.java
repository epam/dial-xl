package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class Value extends Expression1<StringColumn, DoubleColumn> {

    public Value(Expression source) {
        super(source);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.DOUBLE;
    }

    @Override
    protected DoubleColumn evaluate(StringColumn source) {
        return new DoubleLambdaColumn(index -> parse(source.get(index)), source.size());
    }

    private static double parse(String text) {
        if (text != null) {
            try {
                return Double.parseDouble(text);
            } catch (NumberFormatException e) {
                // ignore
            }
        }

        return Double.NaN;
    }
}
