package com.epam.deltix.quantgrid.util;

import lombok.experimental.UtilityClass;
import org.jetbrains.annotations.Nullable;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.concurrent.TimeUnit;

/**
 * Utilities class for Excel serial date. Note that, there are no bugged dates: 1900-02-29 and 1900-01-00.
 */
@UtilityClass
public class Dates {
    private static final LocalDate DATE_BASE = LocalDate.of(1899, 12, 30);

    private static final double NANOS_PER_DAY = TimeUnit.DAYS.toNanos(1);
    private static final double MILLIS_PER_DAY = TimeUnit.DAYS.toMillis(1);
    private static final long DAYS_BASE = ChronoUnit.DAYS.between(LocalDate.of(0, 1, 1), DATE_BASE);
    private static final long EPOCH_BASE = ChronoUnit.DAYS.between(DATE_BASE, LocalDate.of(1970, 1, 1));

    public static double fromDate(@Nullable String date) {
        if (date == null || date.isEmpty()) {
            return Doubles.ERROR_NA;
        }

        return parseDate(date);
    }

    public static double fromDateTime(@Nullable String datetime) {
        if (datetime == null || datetime.isEmpty()) {
            return Doubles.ERROR_NA;
        }

        return parseDateTime(datetime);
    }

    public double fromEpochMillis(long epochMillis) {
        return epochMillis / MILLIS_PER_DAY + EPOCH_BASE;
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

    private double parseDate(String text) {
        if (text.length() < 8 || text.length() > 10) {
            return Doubles.ERROR_NA;
        }

        if (text.length() == 10 && isYYYYMMdd(text)) {
            return toDay(digits4(text, 0), digits2(text, 5), digits2(text, 8));
        }

        return parse(text, false);
    }

    private double parseDateTime(String text) {
        if (text.length() < 12 || text.length() > 32) {
            return Doubles.ERROR_NA;
        }

        // yyyy-MM-dd hh:mm:ss or yyyy-MM-dd hh:mm:ss.SSSSSSSSS
        if (text.length() >= 19 && text.length() <= 29
                && isYYYYMMdd(text) && isSpaceOrT(text, 10) && isTime(text, 11) && isFraction(text, 19)) {
            return toDay(digits4(text, 0), digits2(text, 5), digits2(text, 8),
                    digits2(text, 11), digits2(text, 14), digits2(text, 17),
                    fraction(text, 20));
        }

        return parse(text, true);
    }

    private static double parse(String text, boolean time) {
        int month, day, year = 0;
        int position = 0;

        char c = charAt(text, position++);
        if (!isDigit(c)) {
            return Doubles.ERROR_NA;
        }
        month = digit(c);
        c = charAt(text, position++);
        if (isDigit(c)) {
            month = 10 * month + digit(c);
            c = charAt(text, position++);
        }

        if (c != '/' && c != '-' && c != '.') {
            return Doubles.ERROR_NA;
        }
        char dateSeparator = c;

        c = charAt(text, position++);
        if (!isDigit(c)) {
            return Doubles.ERROR_NA;
        }
        day = digit(c);
        c = charAt(text, position++);
        if (isDigit(c)) {
            day = 10 * day + digit(c);
            c = charAt(text, position++);
        }

        if (c != dateSeparator) {
            return Doubles.ERROR_NA;
        }

        for (int i = 0; i < 4; ++i) {
            c = charAt(text, position++);
            if (!isDigit(c)) {
                return Doubles.ERROR_NA;
            }
            year = 10 * year + digit(c);
        }

        if (!time) {
            // M/d/yyyy or M-d-yyyy or M.d.yyyy
            return position == text.length()
                    ? toDay(year, month, day)
                    : Doubles.ERROR_NA;
        }

        c = charAt(text, position++);
        if (c != ' ') {
            return Doubles.ERROR_NA;
        }

        c = charAt(text, position++);
        if (!isDigit(c)) {
            return Doubles.ERROR_NA;
        }
        int hour = digit(c);
        c = charAt(text, position++);
        if (isDigit(c)) {
            hour = 10 * hour + digit(c);
            c = charAt(text, position++);
        }

        int minute = 0, second = 0, nanosecond = 0;
        boolean hasMinute = false;
        if (c == ':') {
            hasMinute = true;
            c = charAt(text, position++);
            if (!isDigit(c)) {
                return Doubles.ERROR_NA;
            }
            minute = digit(c);
            c = charAt(text, position++);
            if (isDigit(c)) {
                minute = 10 * minute + digit(c);
                c = charAt(text, position++);
            }

            if (c == ':') {
                c = charAt(text, position++);
                if (!isDigit(c)) {
                    return Doubles.ERROR_NA;
                }
                second = digit(c);
                c = charAt(text, position++);
                if (isDigit(c)) {
                    second = 10 * second + digit(c);
                    c = charAt(text, position++);
                }

                if (c == '.') {
                    int nanosCount = 0;
                    int multiplier = 100_000_000;
                    do {
                        c = charAt(text, position++);
                        if (nanosCount == 9) {
                            break;
                        }
                        if (!isDigit(c)) {
                            break;
                        }
                        nanosecond += multiplier * digit(c);
                        multiplier /= 10;
                        ++nanosCount;
                    } while (true);
                    if (nanosCount == 0) {
                        return Doubles.ERROR_NA;
                    }
                }
            }
        }

        if (c == ' ' && is12hour(hour)) {
            // M/d/yyyy h a or M/d/yyyy h:m a or M/d/yyyy h:m:s a or M/d/yyyy h:m:s.S a
            return parseAPM(text, position, year, month, day, hour, minute, second, nanosecond);
        }

        // M/d/yyyy H:m or M/d/yyyy H:m:s or M/d/yyyy H:m:s.S
        return hasMinute && position == text.length() + 1
                ? toDay(year, month, day, hour, minute, second, nanosecond)
                : Doubles.ERROR_NA;
    }

    private static double parseAPM(
            String text, int position, int year, int month, int day, int hour, int minute, int second, long nanosecond) {
        char a = charAt(text, position++);
        char b = charAt(text, position++);
        int shift = 0;
        if (a == 'p' && b == 'm' || a == 'P' && b == 'M') {
            shift = 12;
        } else if (!(a == 'a' && b == 'm' || a == 'A' && b == 'M')) {
            return Doubles.ERROR_NA;
        }

        return text.length() == position
                ? toDay(year, month, day, to24hour(hour, shift), minute, second, nanosecond)
                : Doubles.ERROR_NA;
    }

    private static char charAt(String text, int i) {
        return i < text.length() ? text.charAt(i) : 0;
    }

    private static int digit(char c) {
        return c - '0';
    }

    private static int to24hour(int hour, int shift) {
        return (hour % 12) + shift;
    }

    private static boolean is12hour(int hour) {
        return hour >= 1 && hour <= 12;
    }

    private static boolean isYYYYMMdd(String text) {
        return isDigits4(text, 0) && isHyphen(text, 4) && isDigits2(text, 5) && isHyphen(text, 7)
                && isDigits2(text, 8);
    }

    private static boolean isTime(String text, int index) {
        return isDigits2(text, index) && isColon(text, index + 2)
                && isDigits2(text, index + 3)  && isColon(text, index + 5)
                && isDigits2(text, index + 6);
    }

    private static boolean isFraction(String text, int index) {
        if (index < text.length() && text.charAt(index++) != '.') {
            return false;
        }

        for (; index < text.length(); index++) {
            if (!isDigit(text, index)) {
                return false;
            }
        }

        return true;
    }

    private boolean isHyphen(String text, int index) {
        return text.charAt(index) == '-';
    }

    private boolean isSpaceOrT(String text, int index) {
        char c = text.charAt(index);
        return c == ' ' || c == 'T';
    }

    private boolean isColon(String text, int index) {
        return text.charAt(index) == ':';
    }

    private boolean isDigit(String text, int index) {
        char c = text.charAt(index);
        return isDigit(c);
    }

    private boolean isDigit(char c) {
        return '0' <= c && c <= '9';
    }

    private boolean isDigits2(String text, int index) {
        return isDigit(text, index) && isDigit(text, index + 1);
    }

    private boolean isDigits4(String text, int index) {
        return isDigit(text, index) && isDigit(text, index + 1)
                && isDigit(text, index + 2) && isDigit(text, index + 3);
    }

    private int digit(String text, int index) {
        return text.charAt(index) - '0';
    }

    private int digits2(String text, int index) {
        return 10 * digit(text, index) + digit(text, index + 1);
    }

    private int digits4(String text, int index) {
        return 1000 * digit(text, index) + 100 * digit(text, index + 1)
                + 10 * digit(text, index + 2) + digit(text, index + 3);
    }

    private long fraction(String text, int index) {
        int value = 0;
        int multiplier = 100_000_000;
        while (index < text.length()) {
            value += multiplier * digit(text, index++);
            multiplier /= 10;
        }
        return value;
    }

    /**
     * See LocalDate for more details.
     */
    private double toDay(long year, int month, long day) {
        if (month < 1 || month > 12 || day < 1 || day > 31) {
            return Doubles.ERROR_NA;
        }

        if (day > 28) {
            int max = switch (month) {
                case 2 -> isLeap(year) ? 29 : 28;
                case 4, 6, 9, 11 -> 30;
                default -> 31;
            };

            if (day > max) {
                return Doubles.ERROR_NA;
            }
        }

        long days = 365 * year;
        days += (year + 3) / 4 - (year + 99) / 100 + (year + 399) / 400;
        days += (367 * month - 362) / 12;
        days += day - 1;

        if (month > 2) {
            days--;

            if (!isLeap(year)) {
                days--;
            }
        }

        return days - DAYS_BASE;
    }

    private double toDay(long year, int month, int day, int hour, int minute, int second, long nanosecond) {
        double days = toDay(year, month, day) + toDayFraction(hour, minute, second, nanosecond);
        return Double.isNaN(days) ? Doubles.ERROR_NA : days;
    }

    private double toDayFraction(int hour, int minute, int second, long nanosecond) {
        if (hour > 23 || minute > 59 || second > 59) {
            return Doubles.ERROR_NA;
        }

        nanosecond += 1_000_000_000L * second;
        nanosecond += 60_000_000_000L * minute;
        nanosecond += 3_600_000_000_000L * hour;
        return nanosecond / NANOS_PER_DAY;
    }

    private boolean isLeap(long year) {
        return ((year & 3) == 0) && ((year % 100) != 0 || (year % 400) == 0);
    }
}
