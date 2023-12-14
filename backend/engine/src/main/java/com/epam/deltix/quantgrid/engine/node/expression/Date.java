package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.ExcelDateTime;

public class Date extends Expression3<DoubleColumn, DoubleColumn, DoubleColumn, DoubleColumn> {

    public Date(Expression year, Expression month, Expression day) {
        super(year, month, day);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.DATE;
    }

    @Override
    protected DoubleColumn evaluate(DoubleColumn years, DoubleColumn months, DoubleColumn days) {
        Util.verify(years.size() == months.size() && months.size() == days.size());
        return new DoubleLambdaColumn(i -> ExcelDateTime.of(years.get(i), months.get(i), days.get(i)), years.size());
    }
}
