package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.expression.utils.StringFunctions;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Dates;
import lombok.AllArgsConstructor;
import lombok.Getter;

public class TernaryFunction extends Expression3<Column, Column, Column, Column> {
    private final Type function;

    public TernaryFunction(Expression input1, Expression input2, Expression input3, Type function) {
        super(input1, input2, input3);
        this.function = function;
    }

    @Override
    public ColumnType getType() {
        return function.getResultType();
    }

    @Override
    protected Column evaluate(Column column1, Column column2, Column column3) {
        return switch (function) {
            case DATE -> applyDoubleTernaryFunction(column1, column2, column3, Dates::of);
            case MID -> applyStringDoubleDouble2StringFunction(
                    column1, column2, column3, StringFunctions::mid);
            case SUBSTITUTE -> applyStringTernaryFunction(
                    column1, column2, column3, StringFunctions::substitute);
        };
    }

    @Override
    public String toString() {
        return function.name();
    }

    private static StringColumn applyStringDoubleDouble2StringFunction(
            Column column1, Column column2, Column column3, StringDoubleDouble2StringFunction function) {
        StringColumn first = requireStringColumn(column1);
        DoubleColumn second = requireDoubleColumn(column2);
        DoubleColumn third = requireDoubleColumn(column3);
        return new StringLambdaColumn(
                i -> function.apply(first.get(i), second.get(i), third.get(i)),
                first.size());
    }

    private static DoubleColumn applyDoubleTernaryFunction(
            Column column1, Column column2, Column column3, DoubleTernaryFunction function) {
        DoubleColumn first = requireDoubleColumn(column1);
        DoubleColumn second = requireDoubleColumn(column2);
        DoubleColumn third = requireDoubleColumn(column3);
        return new DoubleLambdaColumn(
                i -> function.apply(first.get(i), second.get(i), third.get(i)),
                first.size());
    }

    private static StringColumn applyStringTernaryFunction(
            Column column1, Column column2, Column column3, StringTernaryFunction function) {
        StringColumn first = requireStringColumn(column1);
        StringColumn second = requireStringColumn(column2);
        StringColumn third = requireStringColumn(column3);
        return new StringLambdaColumn(
                i -> function.apply(first.get(i), second.get(i), third.get(i)),
                first.size());
    }

    @Getter
    @AllArgsConstructor
    public enum Type {
        DATE(ColumnType.DOUBLE, ColumnType.DOUBLE, ColumnType.DOUBLE, ColumnType.DATE),
        MID(ColumnType.STRING, ColumnType.DOUBLE, ColumnType.DOUBLE, ColumnType.STRING),
        SUBSTITUTE(ColumnType.STRING, ColumnType.STRING, ColumnType.STRING, ColumnType.STRING);

        private final ColumnType argument1Type;
        private final ColumnType argument2Type;
        private final ColumnType argument3Type;
        private final ColumnType resultType;
    }

    @FunctionalInterface
    private interface StringDoubleDouble2StringFunction {
        String apply(String arg1, double arg2, double arg3);
    }

    @FunctionalInterface
    private interface DoubleTernaryFunction {
        double apply(double arg1, double arg2, double arg3);
    }

    @FunctionalInterface
    private interface StringTernaryFunction {
        String apply(String arg1, String arg2, String arg3);
    }
}
