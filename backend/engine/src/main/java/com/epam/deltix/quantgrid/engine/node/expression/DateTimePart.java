package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.ExcelDateTime;
import org.apache.spark.sql.Column;

public class DateTimePart extends Expression1<DoubleColumn, DoubleColumn> {

    private final DateTimePartFunction function;

    public DateTimePart(Expression date, DateTimePartFunction function) {
        super(date);
        this.function = function;
    }

    @Override
    public ColumnType getType() {
        return ColumnType.INTEGER;
    }

    @Override
    public Column toSpark() {
        throw new UnsupportedOperationException(function + " is not supported on spark yet");
    }

    @Override
    protected DoubleColumn evaluate(DoubleColumn date) {
        return new DoubleLambdaColumn(i -> function.getValue(date.get(i)), date.size());
    }

    public enum DateTimePartFunction {
        YEAR, MONTH, DAY, HOUR, MINUTE, SECOND;

        double getValue(double date) {
            return switch (this) {
                case YEAR -> ExcelDateTime.getYear(date);
                case MONTH -> ExcelDateTime.getMonth(date);
                case DAY -> ExcelDateTime.getDay(date);
                case HOUR -> ExcelDateTime.getHour(date);
                case MINUTE -> ExcelDateTime.getMinute(date);
                case SECOND -> ExcelDateTime.getSecond(date);
            };
        }
    }
}
