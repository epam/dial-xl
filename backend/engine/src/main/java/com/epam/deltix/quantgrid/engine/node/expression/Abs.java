package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class Abs extends Expression1<DoubleColumn, DoubleColumn> {

    public Abs(Expression source) {
        super(source);
    }

    @Override
    public ColumnType getType() {
        return expression(0).getType();
    }

    @Override
    protected DoubleColumn evaluate(DoubleColumn source) {
        return new DoubleLambdaColumn(index -> Math.abs(source.get(index)), source.size());
    }
}