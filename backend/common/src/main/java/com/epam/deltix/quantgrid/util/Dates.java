package com.epam.deltix.quantgrid.util;

import lombok.experimental.UtilityClass;
import org.jetbrains.annotations.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.format.DateTimeParseException;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

/**
 * Utilities class for Excel serial date. Note that, there are no bugged dates: 1900-02-29 and 1900-01-00.
 */
@UtilityClass
public class Dates {
    private static final LocalDate DATE_BASE = LocalDate.of(1899, 12, 30);

    private static final DateTimeFormatter EXCEL_DATE_FORMAT =
            DateTimeFormatter.ofPattern("M/d/yyyy", Locale.ROOT);

    private static final DateTimeFormatter[] SUPPORTED_DATE_FORMATS = new DateTimeFormatter[] {
            EXCEL_DATE_FORMAT, DateTimeFormatter.ISO_DATE
    };

    public static final DateTimeFormatter EXCEL_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("M/d/yyyy hh:mm:ss a", Locale.ROOT);

    private static final DateTimeFormatter[] SUPPORTED_DATE_TIME_FORMATS = new DateTimeFormatter[] {
            EXCEL_DATE_TIME_FORMAT, DateTimeFormatter.ISO_DATE_TIME
    };

    private static final double NANOS_PER_DAY = TimeUnit.DAYS.toNanos(1);
    private static final double MILLIS_PER_DAY = TimeUnit.DAYS.toMillis(1);

    /**
     * Parse provided string to an Excel date.
     * See {@link #SUPPORTED_DATE_FORMATS} for supported date formats
     *
     * @param date string date
     * @return a serial date if provided date correct, otherwise - NaN
     */
    public static double from(@Nullable String date) {
        if (date == null || date.isEmpty()) {
            return Doubles.ERROR_NA;
        }

        LocalDateTime localDateTime = parseDateTime(date);

        if (localDateTime == null) {
            LocalDate localDate = parseDate(date);

            if (localDate != null) {
                localDateTime = localDate.atStartOfDay();
            }
        }

        return from(localDateTime);
    }

    public static double of(double year, double month, double day) {
        if (Doubles.isError(year)) {
            return year;
        }

        if (Doubles.isError(month)) {
            return month;
        }

        if (Doubles.isError(day)) {
            return day;
        }

        if (Doubles.isEmpty(year)) {
            year = 1899;
        }

        if (Doubles.isEmpty(month)) {
            month = 0.0;
        }

        if (Doubles.isEmpty(day)) {
            day = 0.0;
        }

        try {
            LocalDateTime date = LocalDateTime.of((int) year, 1, 1, 0, 0, 0)
                    .plusMonths((int) month - 1)
                    .plusDays((int) day - 1);

            return from(date);
        } catch (Exception e) {
            return Doubles.ERROR_NA;
        }
    }

    public static double getMonth(double date) {
        LocalDate result = getLocalDate(date);
        return result == null ? Doubles.ERROR_NA : result.getMonthValue();
    }

    public static double getYear(double date) {
        LocalDate result = getLocalDate(date);
        return result == null ? Doubles.ERROR_NA : result.getYear();
    }

    public static double getDay(double date) {
        LocalDate result = getLocalDate(date);
        return result == null ? Doubles.ERROR_NA : result.getDayOfMonth();
    }

    public static double getHour(double date) {
        LocalDateTime result = getLocalDateTime(date);
        return result == null ? Doubles.ERROR_NA : result.getHour();
    }

    public static double getMinute(double date) {
        LocalDateTime result = getLocalDateTime(date);
        return result == null ? Doubles.ERROR_NA : result.getMinute();
    }

    public static double getSecond(double date) {
        LocalDateTime result = getLocalDateTime(date);
        return result == null ? Doubles.ERROR_NA : result.getSecond();
    }

    public LocalDate getLocalDate(double date) {
        if (Doubles.isError(date) || date < 0) {
            return null;
        }

        if (Doubles.isEmpty(date)) {
            date = 0.0;
        }

        return DATE_BASE.plusDays((int) date);
    }

    public LocalDateTime getLocalDateTime(double date) {
        LocalDate result = getLocalDate(date);

        if (result == null) {
            return null;
        }

        long ms = Math.round(MILLIS_PER_DAY * (date - (long) date));
        return LocalDateTime.of(result, LocalTime.ofNanoOfDay(ms * 1_000_000));
    }

    public double from(LocalDateTime date) {
        if (date == null) {
            return Doubles.ERROR_NA;
        }

        double result = ChronoUnit.DAYS.between(DATE_BASE, date) + date.toLocalTime().toNanoOfDay() / NANOS_PER_DAY;
        return result < 0 ? Doubles.ERROR_NA : result;
    }

    @Nullable
    private static LocalDateTime parseDateTime(String text) {
        if (text.length() < 19) { // all supported date-time formats are 19+ chars long
            return null;
        }

        LocalDateTime dateTime = null;
        for (DateTimeFormatter format : SUPPORTED_DATE_TIME_FORMATS) {
            try {
                dateTime = LocalDateTime.parse(text, format);
                break;
            } catch (DateTimeParseException e) {
                // ignore
            }
        }

        return dateTime;
    }

    @Nullable
    private static LocalDate parseDate(String text) {
        if (text.length() < 8) { // all supported date formats are 8+ chars long
            return null;
        }

        LocalDate date = null;
        for (DateTimeFormatter format : SUPPORTED_DATE_FORMATS) {
            try {
                date = LocalDate.parse(text, format);
                break;
            } catch (DateTimeParseException e) {
                // ignore
            }
        }

        return date;
    }
}
