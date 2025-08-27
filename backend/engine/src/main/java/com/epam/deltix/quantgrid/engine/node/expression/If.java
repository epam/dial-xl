package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;

public class If extends Expression3<DoubleColumn, Column, Column, Column> {

    public If(Expression condition, Expression left, Expression right) {
        super(condition, left, right);
    }

    @Override
    public ColumnType getType() {
        return expression(1).getType();
    }

    @Override
    protected Column evaluate(DoubleColumn condition, Column left, Column right) {
        if (left instanceof DoubleColumn lefts && right instanceof DoubleColumn rights) {
            return new DoubleLambdaColumn(
                    index -> {
                        double value = condition.get(index);

                        if (Doubles.isError(value)) {
                            return value;
                        }

                        return isTrue(value) ? lefts.get(index) : rights.get(index);
                    },
                    left.size());
        }

        if (left instanceof StringColumn lefts && right instanceof StringColumn rights) {
            return new StringLambdaColumn(
                    index -> {
                        double value = condition.get(index);

                        if (Doubles.isError(value)) {
                            return Doubles.toStringError(value);
                        }

                        return isTrue(value) ? lefts.get(index) : rights.get(index);
                    },
                    left.size());
        }

        if (left instanceof PeriodSeriesColumn lefts && right instanceof PeriodSeriesColumn rights) {
            return new PeriodSeriesLambdaColumn(
                    index -> {
                        double value = condition.get(index);

                        if (Doubles.isError(value)) {
                            return null;
                        }

                        return isTrue(value) ? lefts.get(index) : rights.get(index);
                    },
                    left.size());
        }

        throw new IllegalArgumentException("Unsupported arguments: " + left.getClass() + " and " + right.getClass());
    }

    public static boolean isTrue(double value) {
        return Doubles.isValue(value) && value != 0.0;
    }
}
