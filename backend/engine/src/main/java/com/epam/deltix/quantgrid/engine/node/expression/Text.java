package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.Strings;
import org.jetbrains.annotations.Nullable;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public class Text extends Expression1<DoubleColumn, StringColumn> {

    @Nullable
    private final String formatting;
    private final ColumnType sourceType;

    public Text(Expression source, ColumnType sourceType, @Nullable String formatting) {
        super(source);
        this.formatting = formatting;
        this.sourceType = sourceType;
    }

    @Override
    public ColumnType getType() {
        return ColumnType.STRING;
    }

    @Override
    protected StringColumn evaluate(DoubleColumn source) {
        return text(source, sourceType, formatting);
    }

    public static StringLambdaColumn text(DoubleColumn source, ColumnType type, String formatting) {
        ToStringConverter convertor = getConverter(type);
        return new StringLambdaColumn(i -> {
            double value = source.get(i);

            if (Doubles.isError(value)) {
                return Doubles.toStringError(value);
            }

            if (Doubles.isEmpty(value)) {
                return Strings.EMPTY;
            }

            return convertor.apply(value, formatting);
        }, source.size());
    }

    private interface ToStringConverter {
        @Nullable
        String apply(double value, @Nullable String formatting);
    }

    private static ToStringConverter getConverter(ColumnType type) {
        return switch (type) {
            case DOUBLE -> Text::doubleToString;
            case BOOLEAN -> Text::booleanToString;
            case INTEGER -> Text::intToString;
            case DATE -> Text::dateToString;
            default -> throw new IllegalArgumentException("Unsupported type: " + type);
        };
    }

    private static String booleanToString(double value, String formatting) {
        return (int) value != 0 ? "TRUE" : "FALSE";
    }

    private static String doubleToString(double value, String formatting) {
        if (formatting != null) {
            return formatAsDate(value, formatting);
        } else {
            return Double.toString(value);
        }
    }

    private static String intToString(double value, String formatting) {
        if (formatting != null) {
            return formatAsDate(value, formatting);
        } else {
            return Long.toString((long) value);
        }
    }

    private static String dateToString(double value, String formatting) {
        LocalDateTime date = Dates.getLocalDateTime(value);
        if (date == null) {
            return Strings.ERROR_NA;
        }

        if (formatting != null) {
            return date.format(DateTimeFormatter.ofPattern(formatting));
        } else {
            return date.format(Dates.EXCEL_DATE_TIME_FORMAT);
        }
    }

    private static String formatAsDate(double value, String formatting) {
        return Dates.getLocalDateTime(value).format(DateTimeFormatter.ofPattern(formatting));
    }
}
