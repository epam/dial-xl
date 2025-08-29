package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Expression2;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;

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
        return Column.lambdaOf(values, (index) -> {
            double key = keys.get(index);
            return Doubles.isError(key) ? Util.NA_REF : (long) key;
        }, keys.size());
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        throw new UnsupportedOperationException("Projection");
    }
}
