package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class Substring extends ExpressionN<Column, StringColumn> {

    private static final String EMPTY_STRING = "";

    private final SubstringFunction function;

    public Substring(SubstringFunction function, List<Expression> expressions) {
        super(expressions);
        this.function = function;
        Util.verify(function.getArgumentsCount() == expressions.size());
    }

    @Override
    public ColumnType getType() {
        return ColumnType.STRING;
    }

    @Override
    protected StringColumn evaluate(List<Column> args) {
        return switch (function) {
            case LEFT -> left((StringColumn) args.get(0), (DoubleColumn) args.get(1));
            case RIGHT -> right((StringColumn) args.get(0), (DoubleColumn) args.get(1));
            case MID -> mid((StringColumn) args.get(0), (DoubleColumn) args.get(1), (DoubleColumn) args.get(2));
        };
    }

    private static StringLambdaColumn left(StringColumn values, DoubleColumn lengths) {
        return new StringLambdaColumn(i -> {
            String value = values.get(i);
            double length = lengths.get(i);
            if (Util.isNa(value) || Util.isNa(length) || length < 0) {
                return null;
            }

            if (length == 0) {
                return EMPTY_STRING;
            }

            int numberOfChars = Math.min(value.length(), (int) length);
            return value.substring(0, numberOfChars);
        }, values.size());
    }

    private static StringLambdaColumn right(StringColumn values, DoubleColumn lengths) {
        return new StringLambdaColumn(i -> {
            String value = values.get(i);
            double length = lengths.get(i);
            if (Util.isNa(value) || Util.isNa(length) || length < 0) {
                return null;
            }

            if (length == 0) {
                return EMPTY_STRING;
            }

            int valueLength = value.length();
            int numberOfChars = Math.min(valueLength, (int) length);
            return value.substring(valueLength - numberOfChars);
        }, values.size());
    }

    private static StringLambdaColumn mid(StringColumn values, DoubleColumn startNums, DoubleColumn numChars) {
        return new StringLambdaColumn(i -> {
            String value = values.get(i);
            double start = startNums.get(i);
            double length = numChars.get(i);
            if (Util.isNa(value) || Util.isNa(start) || start <= 0 || Util.isNa(length) || length < 0) {
                return null;
            }

            if (length == 0) {
                return EMPTY_STRING;
            }

            int valueLength = value.length();
            int startPosition = (int) start - 1;
            int numberOfChars = (int) length;

            if (startPosition > valueLength) {
                return EMPTY_STRING;
            }

            return value.substring(startPosition, Math.min(startPosition + numberOfChars, valueLength));
        }, values.size());
    }
}
