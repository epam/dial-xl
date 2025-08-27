package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record DateFormat(String pattern) implements ColumnFormat {
    public static final DateFormat DEFAULT_DATE_FORMAT = new DateFormat("M/d/yyyy");
    public static final DateFormat DEFAULT_DATE_TIME_FORMAT = new DateFormat("M/d/yyyy hh:mm:ss a");

    @Override
    public Formatter createFormatter() {
        DateTimeFormatter dateTimeFormatter = DateTimeFormatter.ofPattern(pattern, FormatUtils.DEFAULT_LOCALE);
        return value -> {
            LocalDateTime date = Dates.getLocalDateTime(value);
            if (date == null) {
                return Strings.ERROR_NA;
            }
            return date.format(dateTimeFormatter);
        };
    }

    @Override
    public String toString() {
        return "Date,[" + pattern + "]";
    }
}
