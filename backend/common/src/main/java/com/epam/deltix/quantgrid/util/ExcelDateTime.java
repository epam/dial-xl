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
 * Utilities class for Excel serial date.
 * See the detailed algo here:
 * <a href="https://stackoverflow.com/questions/56717088/algorithm-for-converting-serial-date-excel-to-year-month-day-in-c">Excel Serial Date</a>
 */
@UtilityClass
public class ExcelDateTime {
    // Era - the period in which the number of leap days are the same
    private static final int YEARS_IN_ERA = 400;
    private static final int DAYS_IN_ERA = 146_097;
    private static final int DAYS_IN_REGULAR_YEAR = 365;
    // this is Excel representation of 02/29/1900
    public static final int SERIAL_EXCEL_BUGGED_DATE = 60;
    // this is the number of days between 0000-03-01 and 1900-01-01
    private static final int DAYS_FOR_ADJUSTMENT = 693899;

    private static final int[] NUMBER_OF_DAYS_IN_MONTH_IN_REGULAR_YEAR =
            new int[] {31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    private static final int[] NUMBER_OF_DAYS_IN_MONTH_IN_LEAP_YEAR =
            new int[] {31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};

    private static final int EXCEL_BUGGED_DAY = 29;
    private static final int EXCEL_BUGGED_MONTH = 2;
    private static final int EXCEL_BUGGED_YEAR = 1900;

    private static final LocalDate BASE_DATE = LocalDate.of(1900, 1, 1);

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
            return Double.NaN;
        }

        boolean isBuggedYear = date.contains("1900");
        date = isBuggedYear ? date.replace("1900", "1904") : date;

        LocalDateTime localDateTime = parseDateTime(date);
        if (localDateTime == null) {
            LocalDate localDate = parseDate(date);
            if (localDate != null) {
                localDateTime = localDate.atStartOfDay();
            }
        }

        return from(localDateTime, isBuggedYear);
    }

    public static double of(double year, double month, double day) {
        if (isNa(year) || isNa(month) || isNa(day)) {
            return Double.NaN;
        }

        if (isBuggedDate(year, month, day)) {
            return SERIAL_EXCEL_BUGGED_DATE;
        }

        if (!isValidYear(year) || !isValidMonth(month) || !isValidDay(year, month, day)) {
            return Double.NaN;
        }

        // algorithm specific, because in calculation our baseDate is 0000-03-01
        year = month <= 2 ? year - 1 : year;

        int era = (int) (year / YEARS_IN_ERA);
        int yearInEra = (int) (year - era * YEARS_IN_ERA);
        // see class description for formula reference
        int dayInYear = (int) ((153 * (month + (month > 2 ? -3 : 9)) + 2) / 5 + day - 1);
        int dayInEra = yearInEra * DAYS_IN_REGULAR_YEAR + yearInEra / 4 - yearInEra / 100 + dayInYear;

        int serial = era * DAYS_IN_ERA + dayInEra - DAYS_FOR_ADJUSTMENT;

        // SERIAL_EXCEL_BUGGED_DATE inclusive, because of the decrementing year in corner cases
        if (serial <= SERIAL_EXCEL_BUGGED_DATE) {
            // compensation for supporting excel leap year bug
            serial--;
        }

        return serial;
    }

    public static double getMonth(double serialDate) {
        if (isNa(serialDate) || serialDate <= 0) {
            return Double.NaN;
        }

        if (isBuggedDate(serialDate)) {
            return EXCEL_BUGGED_MONTH;
        }

        if (serialDate < SERIAL_EXCEL_BUGGED_DATE) {
            serialDate++;
        }

        serialDate += DAYS_FOR_ADJUSTMENT;

        int era = getEra(serialDate);
        int dayInEra = getDayInEra(serialDate, era);
        int yearInEra = getYearInEra(dayInEra);
        int dayInYear = getDayInYear(dayInEra, yearInEra);

        // see class description for formula reference
        int mp = (5 * dayInYear + 2) / 153;
        int month = mp + (mp < 10 ? 3 : -9);

        return month;
    }

    public static double getYear(double serialDate) {
        if (isNa(serialDate) || serialDate <= 0) {
            return Double.NaN;
        }

        if (isBuggedDate(serialDate)) {
            return EXCEL_BUGGED_YEAR;
        }

        if (serialDate < SERIAL_EXCEL_BUGGED_DATE) {
            serialDate++;
        }

        serialDate += DAYS_FOR_ADJUSTMENT;

        int era = getEra(serialDate);
        int dayInEra = getDayInEra(serialDate, era);
        int yearInEra = getYearInEra(dayInEra);
        int dayInYear = getDayInYear(dayInEra, yearInEra);

        // see class description for formula reference
        int year = yearInEra + era * YEARS_IN_ERA;
        int mp = (5 * dayInYear + 2) / 153;
        int month = mp + (mp < 10 ? 3 : -9);

        return month <= 2 ? year + 1 : year;
    }

    public static double getDay(double serialDate) {
        if (isNa(serialDate) || serialDate <= 0) {
            return Double.NaN;
        }

        if (isBuggedDate(serialDate)) {
            return EXCEL_BUGGED_DAY;
        }

        // SERIAL_EXCEL_BUGGED_DATE exclusive, because of incrementing year after this check
        if (serialDate < SERIAL_EXCEL_BUGGED_DATE) {
            // compensation for supporting excel leap year bug
            serialDate++;
        }

        serialDate += DAYS_FOR_ADJUSTMENT;

        int era = getEra(serialDate);
        int dayInEra = getDayInEra(serialDate, era);
        int yearInEra = getYearInEra(dayInEra);
        int dayInYear = getDayInYear(dayInEra, yearInEra);

        // see class description for formula reference
        int mp = (5 * dayInYear + 2) / 153;
        int day = dayInYear - (153 * mp + 2) / 5 + 1;

        return day;
    }

    public static double getHour(double serialTime) {
        if (isNa(serialTime) || serialTime < 0) {
            return Double.NaN;
        }
        var millis = getMilliseconds(serialTime);
        return (int) millis / (1000 * 60 * 60);
    }

    public static double getMinute(double serialTime) {
        if (isNa(serialTime) || serialTime < 0) {
            return Double.NaN;
        }
        var millis = getMilliseconds(serialTime);
        return (int) (millis / (1000 * 60)) % 60;
    }

    public static double getSecond(double serialTime) {
        if (isNa(serialTime) || serialTime < 0) {
            return Double.NaN;
        }
        var millis = getMilliseconds(serialTime);
        var seconds = (int) (millis / 1000.0) % 60;

        return seconds;
    }

    public LocalDate getLocalDate(double serialDate) {
        if (serialDate < SERIAL_EXCEL_BUGGED_DATE) {
            serialDate++;
        }

        return BASE_DATE.plusDays((int) serialDate - 2);
    }

    public LocalDateTime getLocalDateTime(double serialDate) {
        LocalDate date = getLocalDate(serialDate);
        long milliseconds = getMilliseconds(serialDate);

        return LocalDateTime.of(date, LocalTime.ofNanoOfDay(milliseconds * 1_000_000));
    }

    public double from(LocalDateTime dateTime) {
        boolean isBuggedYear = dateTime != null && dateTime.getYear() == EXCEL_BUGGED_YEAR;
        if (isBuggedYear) {
            // replace bugged 1900 to 1904
            dateTime = dateTime.plusYears(4);
        }
        return from(dateTime, isBuggedYear);
    }

    public static boolean isBuggedDate(double excelDate) {
        return (int) excelDate == SERIAL_EXCEL_BUGGED_DATE;
    }

    // excel stores time as a fractional portion of a 24-hour day.
    // this method converts excel serial-time to a number of milliseconds of a day
    private static long getMilliseconds(double serialTime) {
        return Math.round(MILLIS_PER_DAY * (serialTime - (long) serialTime));
    }

    private double from(LocalDateTime localDateTime, boolean isBuggedYear) {
        double result = (localDateTime == null) ? Double.NaN : (ChronoUnit.DAYS.between(BASE_DATE, localDateTime) + 1) +
                (localDateTime.toLocalTime().toNanoOfDay() / NANOS_PER_DAY);

        // check if the date before baseDate
        if (result <= 0) {
            return Double.NaN;
        }

        // Backward compatibility with Excel bug. 1900 wasn't a leap year, while Excel thinks it does.
        if (isBuggedYear) {
            result = result - 1460; // difference between 1900 and 1904
        } else {
            ++result; // to compensate non existing 2/29/1900
        }

        return result;
    }

    private static int getEra(double serialDate) {
        return (int) (serialDate / DAYS_IN_ERA);
    }

    private static int getDayInEra(double serialDate, int era) {
        return ((int) serialDate - (era * DAYS_IN_ERA));
    }

    private static int getYearInEra(int dayInEra) {
        // 1460 - the number of days in 4 years without leap day
        // 36524 - the number of days in 100 years without last leap days (if any)
        // 146096 - the number of days in 400(Era) years without last leap day (if any)
        // see reference for mo detailed information
        return (dayInEra - dayInEra / 1460 + dayInEra / 36524 - dayInEra / 146096) / DAYS_IN_REGULAR_YEAR;
    }

    private static int getDayInYear(int dayInEra, int yearInEra) {
        // see class description for formula reference
        return dayInEra - (DAYS_IN_REGULAR_YEAR * yearInEra + yearInEra / 4 - yearInEra / 100);
    }

    static boolean isBuggedDate(double year, double month, double day) {
        return (int) year == EXCEL_BUGGED_YEAR && (int) month == EXCEL_BUGGED_MONTH && (int) day == EXCEL_BUGGED_DAY;
    }

    private static boolean isValidYear(double year) {
        return year >= 1900;
    }

    private static boolean isValidMonth(double month) {
        return month >= 1 && month <= 12;
    }

    private static boolean isValidDay(double year, double month, double day) {
        boolean isLeapYear = ((year % 4 == 0) && (year % 100 != 0)) || (year % 400 == 0);
        int monthIndex = (int) (month - 1);
        int daysInThisMonth = isLeapYear ? NUMBER_OF_DAYS_IN_MONTH_IN_LEAP_YEAR[monthIndex] :
                NUMBER_OF_DAYS_IN_MONTH_IN_REGULAR_YEAR[monthIndex];

        return day >= 1 && day <= daysInThisMonth;
    }

    @Nullable
    private static LocalDateTime parseDateTime(String text) {
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

    private static boolean isNa(double value) {
        return Double.isNaN(value);
    }
}
