package com.epam.deltix.quantgrid.util;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.time.temporal.ChronoUnit;
import java.util.Locale;
import java.util.concurrent.TimeUnit;

import lombok.experimental.UtilityClass;
import org.jetbrains.annotations.Nullable;

/**
 * Utilities class for Excel serial date. Note that, there are no bugged dates: 1900-02-29 and 1900-01-00.
 */
@UtilityClass
public class Dates {
    private static final LocalDate DATE_BASE = LocalDate.of(1899, 12, 30);

    public static final DateTimeFormatter EXCEL_DATE_TIME_FORMAT =
            DateTimeFormatter.ofPattern("M/d/yyyy hh:mm:ss a", Locale.ROOT);

    private static final double NANOS_PER_DAY = TimeUnit.DAYS.toNanos(1);
    private static final double MILLIS_PER_DAY = TimeUnit.DAYS.toMillis(1);
    private static final long DAYS_BASE = ChronoUnit.DAYS.between(LocalDate.of(0, 1, 1), DATE_BASE);

    public static double from(@Nullable String date) {
        if (date == null || date.isEmpty()) {
            return Doubles.ERROR_NA;
        }

        double value = parseDate(date);
        if (Doubles.isValue(value)) {
            return value;
        }

        return parseDateTime(date);
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

        if (text.length() == 8) { // M/d/yyyy
            if (isMDYYYY(text)) {
                return toDay(digits4(text, 4), digit(text, 0), digit(text, 2));
            }
        } else if (text.length() == 9) { // MM/d/yyyy or M/dd/yyyy
            if (isMMDYYYY(text)) {
                return toDay(digits4(text, 5), digits2(text, 0), digit(text, 3));
            } else if (isMDDYYYY(text)) {
                return toDay(digits4(text, 5), digit(text, 0), digits2(text, 2));
            }
        } else { // MM/dd/yyyy or yyyy-MM-dd
            if (isMMDDYYYY(text)) {
                return toDay(digits4(text, 6), digits2(text, 0), digits2(text, 3));
            } else if (isYYYYMMdd(text)) {
                return toDay(digits4(text, 0), digits2(text, 5), digits2(text, 8));
            }
        }

        return Doubles.ERROR_NA;
    }

    private double parseDateTime(String text) {
        if (text.length() < 19 || text.length() > 29) {
            return Doubles.ERROR_NA;
        }

        // yyyy-MM-dd hh:mm:ss or yyyy-MM-dd hh:mm:ss.SSSSSSSSS
        if (isYYYYMMdd(text) && isSpaceOrT(text, 10) && isTime(text, 11) && isFraction(text, 19)) {
            return toDay(digits4(text, 0), digits2(text, 5), digits2(text, 8),
                    digits2(text, 11), digits2(text, 14), digits2(text, 17),
                    fraction(text, 20));
        } else if (text.length() == 20) {  // M/d/yyyy hh:mm:ss AM
            if (isMDYYYY(text) && isSpace(text, 8) && isTime(text, 9) && isSpace(text, 17) && isAPM(text, 18)) {
                return toDay(digits4(text, 4), digit(text, 0), digit(text, 2),
                        digits2(text, 9) + (isP(text, 18) ? 12 : 0), digits2(text, 12), digits2(text, 15),
                        0);
            }
        } else if (text.length() == 21) {  // MM/d/yyyy hh:mm:ss AM or M/dd/yyyy hh:mm:ss PM
            if (isMMDYYYY(text) && isSpace(text, 9) && isTime(text, 10) && isSpace(text, 18) && isAPM(text, 19)) {
                return toDay(digits4(text, 5), digits2(text, 0), digit(text, 3),
                        digits2(text, 10) + (isP(text, 19) ? 12 : 0), digits2(text, 13), digits2(text, 16),
                        0);
            } else if (isMDDYYYY(text) && isSpace(text, 9) && isTime(text, 10) && isSpace(text, 18) && isAPM(text, 19)) {
                return toDay(digits4(text, 5), digit(text, 0), digits2(text, 2),
                        digits2(text, 10) + (isP(text, 19) ? 12 : 0), digits2(text, 13), digits2(text, 16),
                        0);
            }
        } else if (text.length() == 22) { // MM/dd/yyyy hh:mm:ss AM
            if (isMMDDYYYY(text) && isSpace(text, 10) && isTime(text, 11) && isSpace(text, 19) && isAPM(text, 20)) {
                return toDay(digits4(text, 6), digits2(text, 0), digits2(text, 3),
                        digits2(text, 11) + (isP(text, 20) ? 12 : 0), digits2(text, 14), digits2(text, 17),
                        0);
            }
        }

        return Doubles.ERROR_NA;
    }

    private static boolean isMDYYYY(String text) {
        return isDigit(text, 0) && isSlash(text, 1) && isDigit(text, 2)
                && isSlash(text, 3) && isDigits4(text, 4);
    }

    private static boolean isMMDYYYY(String text) {
        return isDigits2(text, 0) && isSlash(text, 2) && isDigit(text, 3)
                && isSlash(text, 4) && isDigits4(text, 5);
    }

    private static boolean isMDDYYYY(String text) {
        return isDigit(text, 0) && isSlash(text, 1) && isDigits2(text, 2)
                && isSlash(text, 4) && isDigits4(text, 5);
    }

    private static boolean isMMDDYYYY(String text) {
        return isDigits2(text, 0) && isSlash(text, 2) && isDigits2(text, 3)
                && isSlash(text, 5) && isDigits4(text, 6);
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

    private static boolean isAPM(String text, int index) {
        char a = text.charAt(index);
        char b = text.charAt(index + 1);
        return (a == 'A' || a == 'P') && b == 'M';
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

    private boolean isSlash(String text, int index) {
        return text.charAt(index) == '/';
    }

    private boolean isHyphen(String text, int index) {
        return text.charAt(index) == '-';
    }

    private boolean isSpace(String text, int index) {
        return text.charAt(index) == ' ';
    }

    private boolean isSpaceOrT(String text, int index) {
        char c = text.charAt(index);
        return c == ' ' || c == 'T';
    }

    private boolean isColon(String text, int index) {
        return text.charAt(index) == ':';
    }

    private boolean isP(String text, int index) {
        return text.charAt(index) == 'P';
    }

    private boolean isDigit(String text, int index) {
        char c = text.charAt(index);
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
