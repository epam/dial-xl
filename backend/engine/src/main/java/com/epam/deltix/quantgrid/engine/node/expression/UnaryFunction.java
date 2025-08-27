package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.utils.DoubleFunctions;
import com.epam.deltix.quantgrid.engine.node.expression.utils.StringFunctions;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import lombok.AllArgsConstructor;
import lombok.Getter;
import org.apache.commons.lang3.StringUtils;

import java.util.function.DoubleFunction;
import java.util.function.DoubleUnaryOperator;
import java.util.function.ToDoubleFunction;
import java.util.function.UnaryOperator;
import javax.annotation.Nullable;

public class UnaryFunction extends Expression1<Column, Column> {
    private final Type function;

    public UnaryFunction(Expression source, Type function) {
        super(source);
        this.function = function;
    }

    @Override
    public ColumnType getType() {
        return function.getResultType();
    }

    @Override
    protected Column evaluate(Column source) {
        return switch (function) {
            case ABS -> applyDoubleUnaryFunction(source, DoubleFunctions::abs);
            case ACOS -> applyDoubleUnaryFunction(source, DoubleFunctions::acos);
            case ASIN -> applyDoubleUnaryFunction(source, DoubleFunctions::asin);
            case ATAN -> applyDoubleUnaryFunction(source, DoubleFunctions::atan);
            case CEIL -> applyDoubleUnaryFunction(source, DoubleFunctions::ceil);
            case COS -> applyDoubleUnaryFunction(source, DoubleFunctions::cos);
            case DAY -> applyDoubleUnaryFunction(source, Dates::getDay);
            case EXP -> applyDoubleUnaryFunction(source, DoubleFunctions::exp);
            case FLOOR -> applyDoubleUnaryFunction(source, DoubleFunctions::floor);
            case HOUR -> applyDoubleUnaryFunction(source, Dates::getHour);
            case ISNA -> isNa(source);
            case LEN -> applyString2DoubleFunction(source, StringFunctions::len);
            case LN -> applyDoubleUnaryFunction(source, DoubleFunctions::log);
            case LOG10 -> applyDoubleUnaryFunction(source, DoubleFunctions::log10);
            case LOWER -> applyStringUnaryFunction(source, StringUtils::lowerCase);
            case MINUTE -> applyDoubleUnaryFunction(source, Dates::getMinute);
            case MONTH -> applyDoubleUnaryFunction(source, Dates::getMonth);
            case ROUND -> applyDoubleUnaryFunction(source, DoubleFunctions::round);
            case SECOND -> applyDoubleUnaryFunction(source, Dates::getSecond);
            case SIN -> applyDoubleUnaryFunction(source, DoubleFunctions::sin);
            case SQRT -> applyDoubleUnaryFunction(source, DoubleFunctions::sqrt);
            case TAN -> applyDoubleUnaryFunction(source, DoubleFunctions::tan);
            case TRIM -> applyStringUnaryFunction(source, StringUtils::trim);
            case VALUE -> applyString2DoubleFunction(source, Doubles::parseDouble);
            case UNICHAR -> applyDouble2StringFunction(source, StringFunctions::fromCharCode);
            case UPPER -> applyStringUnaryFunction(source, StringUtils::upperCase);
            case YEAR -> applyDoubleUnaryFunction(source, Dates::getYear);
        };
    }

    @Override
    public String toString() {
        return function.name();
    }

    private static DoubleColumn applyDoubleUnaryFunction(Column source, DoubleUnaryOperator function) {
        DoubleColumn doubleColumn = requireDoubleColumn(source);
        return new DoubleLambdaColumn(index -> function.applyAsDouble(doubleColumn.get(index)), source.size());
    }

    private static DoubleColumn applyString2DoubleFunction(Column source, ToDoubleFunction<String> function) {
        StringColumn stringColumn = requireStringColumn(source);
        return new DoubleLambdaColumn(index -> function.applyAsDouble(stringColumn.get(index)), source.size());
    }

    private static StringColumn applyDouble2StringFunction(Column source, DoubleFunction<String> function) {
        DoubleColumn doubleColumn = requireDoubleColumn(source);
        return new StringLambdaColumn(index -> function.apply(doubleColumn.get(index)), source.size());
    }

    private static StringColumn applyStringUnaryFunction(Column source, UnaryOperator<String> function) {
        StringColumn stringColumn = requireStringColumn(source);
        return new StringLambdaColumn(index -> function.apply(stringColumn.get(index)), source.size());
    }

    private static DoubleColumn isNa(Column source) {
        if (source instanceof DoubleColumn values) {
            return new DoubleLambdaColumn(index -> Doubles.isNa(values.get(index)) ? 1.0 : 0.0, values.size());
        }

        if (source instanceof StringColumn values) {
            return new DoubleLambdaColumn(index -> Strings.isNa(values.get(index)) ? 1.0 : 0.0, values.size());
        }

        if (source instanceof PeriodSeriesColumn values) {
            return new DoubleLambdaColumn(index -> Util.isNa(values.get(index)) ? 1.0 : 0.0, values.size());
        }

        throw new IllegalArgumentException("Unsupported argument type: " + source.getClass());
    }

    @Getter
    @AllArgsConstructor
    public enum Type {
        ABS(ColumnType.DOUBLE, ColumnType.DOUBLE),
        ACOS(ColumnType.DOUBLE, ColumnType.DOUBLE),
        ASIN(ColumnType.DOUBLE, ColumnType.DOUBLE),
        ATAN(ColumnType.DOUBLE, ColumnType.DOUBLE),
        CEIL(ColumnType.DOUBLE, ColumnType.DOUBLE),
        COS(ColumnType.DOUBLE, ColumnType.DOUBLE),
        DAY(ColumnType.DOUBLE, ColumnType.DOUBLE),
        EXP(ColumnType.DOUBLE, ColumnType.DOUBLE),
        FLOOR(ColumnType.DOUBLE, ColumnType.DOUBLE),
        HOUR(ColumnType.DOUBLE, ColumnType.DOUBLE),
        ISNA(null, ColumnType.DOUBLE),
        LEN(ColumnType.STRING, ColumnType.DOUBLE),
        LN(ColumnType.DOUBLE, ColumnType.DOUBLE),
        LOG10(ColumnType.DOUBLE, ColumnType.DOUBLE),
        LOWER(ColumnType.STRING, ColumnType.STRING),
        MINUTE(ColumnType.DOUBLE, ColumnType.DOUBLE),
        MONTH(ColumnType.DOUBLE, ColumnType.DOUBLE),
        ROUND(ColumnType.DOUBLE, ColumnType.DOUBLE),
        SECOND(ColumnType.DOUBLE, ColumnType.DOUBLE),
        SIN(ColumnType.DOUBLE, ColumnType.DOUBLE),
        SQRT(ColumnType.DOUBLE, ColumnType.DOUBLE),
        TAN(ColumnType.DOUBLE, ColumnType.DOUBLE),
        TRIM(ColumnType.STRING, ColumnType.STRING),
        VALUE(ColumnType.STRING, ColumnType.DOUBLE),
        UNICHAR(ColumnType.DOUBLE, ColumnType.STRING),
        UPPER(ColumnType.STRING, ColumnType.STRING),
        YEAR(ColumnType.DOUBLE, ColumnType.DOUBLE);

        @Nullable
        private final ColumnType argumentType;
        private final ColumnType resultType;
    }
}
