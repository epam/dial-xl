package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

public record DateFormat(DateTimeFormatter formatter, String pattern) implements ColumnFormat {
    public static final DateFormat DEFAULT_DATE_FORMAT = ofPattern("M/d/yyyy");
    public static final DateFormat DEFAULT_DATE_TIME_FORMAT = ofPattern("M/d/yyyy hh:mm:ss a");

    @Override
    public Formatter createFormatter() {
        return value -> {
            LocalDateTime date = Dates.getLocalDateTime(value);
            if (date == null) {
                return Strings.ERROR_NA;
            }
            return date.format(formatter);
        };
    }

    @Override
    public String toString() {
        return "Date,[" + pattern + "]";
    }

    public static DateFormat ofPattern(String pattern) {
        try {
            return new DateFormat(DateTimeFormatter.ofPattern(pattern, FormatUtils.DEFAULT_LOCALE), pattern);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid date format: " + pattern + ". Error: " + e.getMessage(), e);
        }
    }
}
