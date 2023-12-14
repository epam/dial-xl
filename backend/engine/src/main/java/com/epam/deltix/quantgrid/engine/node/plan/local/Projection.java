package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Expression2;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class Projection extends Expression2<DoubleColumn, Column, Column> {

    public Projection(Expression key, Expression value) {
        super(key, value);
    }

    public Expression getKey() {
        return expression(0);
    }

    public Expression getValue() {
        return expression(1);
    }

    @Override
    protected Plan layout() {
        return getKey().getLayout();
    }

    @Override
    public ColumnType getType() {
        return getValue().getType();
    }

    @Override
    protected Column evaluate(DoubleColumn keys, Column values) {
        int size = Util.toIntSize(keys);

        if (values instanceof DoubleColumn column) {
            return new DoubleLambdaColumn(index -> {
                double key = keys.get(index);
                return Util.isNa(key) ? Double.NaN : column.get((long) key);
            }, size);
        }

        if (values instanceof StringColumn column) {
            return new StringLambdaColumn(index -> {
                double key = keys.get(index);
                return Util.isNa(key) ? null : column.get((long) key);
            }, size);
        }

        if (values instanceof PeriodSeriesColumn column) {
            return new PeriodSeriesLambdaColumn(index -> {
                double key = keys.get(index);
                return Util.isNa(key) ? null : column.get((long) key);
            }, size);
        }

        throw new UnsupportedOperationException();
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        throw new UnsupportedOperationException("Projection");
    }
}
