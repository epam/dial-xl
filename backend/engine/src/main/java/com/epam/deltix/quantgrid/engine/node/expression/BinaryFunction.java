package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.expression.utils.DateFunctions;
import com.epam.deltix.quantgrid.engine.node.expression.utils.DoubleFunctions;
import com.epam.deltix.quantgrid.engine.node.expression.utils.StringFunctions;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.commons.lang3.StringUtils;

import java.util.function.BinaryOperator;
import java.util.function.DoubleBinaryOperator;

public class BinaryFunction extends Expression2<Column, Column, Column> {
    private final Type function;

    public BinaryFunction(Expression input1, Expression input2, Type function) {
        super(input1, input2);
        this.function = function;
    }

    @Override
    protected Plan layout() {
        return expression(0).getLayout();
    }

    @Override
    public ColumnType getType() {
        return function.getResultType();
    }

    @Override
    protected Column evaluate(Column column1, Column column2) {
        return switch (function) {
            case CONTAINS -> applyStringString2DoubleFunction(column1, column2, StringFunctions::contains);
            case LEFT -> applyStringDouble2StringFunction(column1, column2, StringFunctions::left);
            case LOG -> applyDoubleBinaryFunction(column1, column2, DoubleFunctions::log);
            case RIGHT -> applyStringDouble2StringFunction(column1, column2, StringFunctions::right);
            case STRIP -> applyStringBinaryFunction(column1, column2, StringFunctions::strip);
            case STRIP_END -> applyStringBinaryFunction(column1, column2, StringFunctions::stripEnd);
            case STRIP_START -> applyStringBinaryFunction(column1, column2, StringFunctions::stripStart);
            case WORKDAY -> applyDoubleBinaryFunction(column1, column2, DateFunctions::workDay);
        };
    }

    @Override
    public String toString() {
        return function.name();
    }

    private static StringColumn applyStringDouble2StringFunction(
            Column column1, Column column2, StringDouble2StringFunction function) {
        StringColumn first = requireStringColumn(column1);
        DoubleColumn second = requireDoubleColumn(column2);
        return new StringLambdaColumn(i -> function.apply(first.get(i), second.get(i)), column1.size());
    }

    private static DoubleColumn applyStringString2DoubleFunction(Column column1, Column column2,
                                                                 StringString2DoubleFunction function) {
        StringColumn first = requireStringColumn(column1);
        StringColumn second = requireStringColumn(column2);
        return new DoubleLambdaColumn(i -> function.apply(first.get(i), second.get(i)), column1.size());
    }

    private static DoubleColumn applyDoubleBinaryFunction(
            Column column1, Column column2, DoubleBinaryOperator function) {
        DoubleColumn first = requireDoubleColumn(column1);
        DoubleColumn second = requireDoubleColumn(column2);
        return new DoubleLambdaColumn(i -> function.applyAsDouble(first.get(i), second.get(i)), column1.size());
    }

    private static StringColumn applyStringBinaryFunction(
            Column column1, Column column2, BinaryOperator<String> function) {
        StringColumn first = requireStringColumn(column1);
        StringColumn second = requireStringColumn(column2);
        return new StringLambdaColumn(i -> function.apply(first.get(i), second.get(i)), column1.size());
    }

    @Getter
    @AllArgsConstructor
    public enum Type {
        CONTAINS(ColumnType.STRING, ColumnType.STRING, ColumnType.BOOLEAN),
        LEFT(ColumnType.STRING, ColumnType.INTEGER, ColumnType.STRING),
        LOG(ColumnType.DOUBLE, ColumnType.DOUBLE, ColumnType.DOUBLE),
        RIGHT(ColumnType.STRING, ColumnType.INTEGER, ColumnType.STRING),
        STRIP(ColumnType.STRING, ColumnType.STRING, ColumnType.STRING),
        STRIP_END(ColumnType.STRING, ColumnType.STRING, ColumnType.STRING),
        STRIP_START(ColumnType.STRING, ColumnType.STRING, ColumnType.STRING),
        WORKDAY(ColumnType.DATE, ColumnType.INTEGER, ColumnType.DATE);

        private final ColumnType argument1Type;
        private final ColumnType argument2Type;
        private final ColumnType resultType;
    }

    @FunctionalInterface
    private interface StringDouble2StringFunction {
        String apply(String arg1, double arg2);
    }

    @FunctionalInterface
    private interface StringString2DoubleFunction {
        double apply(String arg1, String arg2);
    }
}
