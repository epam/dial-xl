package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class RangeLocal extends Plan0<Table> {

    public RangeLocal(Expression count) {
        super(List.of(count));
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.INTEGER));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    public Table execute() {
        DoubleColumn count = expression(0).evaluate();
        long size = extractCount(count);
        DoubleColumn column = new DoubleLambdaColumn(index -> index, size);
        return new LocalTable(column);
    }

    public static long extractCount(DoubleColumn column) {
        double value = column.get(0);
        long integer = (long) value;

        if (integer != value) {
            throw new IllegalArgumentException("Count is not integer");
        }

        if (integer < 0) {
            throw new IllegalArgumentException("Count is negative integer");
        }

        return integer;
    }
}