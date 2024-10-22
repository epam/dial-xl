package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;

public class DisplayPeriodPoint extends Expression3<StringColumn, DoubleColumn, DoubleColumn, StringColumn> {

    public DisplayPeriodPoint(Expression period, Expression date, Expression value) {
        super(period, date, value);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.STRING;
    }

    @Override
    protected StringColumn evaluate(StringColumn periods, DoubleColumn dates, DoubleColumn values) {
        return new StringLambdaColumn(index -> display(periods, dates, values, index), periods.size());
    }

    private static String display(StringColumn periods, DoubleColumn dates, DoubleColumn values, long index) {
        Period period = Period.valueOf(periods.get(index));
        double date = dates.get(index);
        double value = values.get(index);
        return "(" + period.format(date) + ", " + Doubles.toString(value) + ")";
    }
}