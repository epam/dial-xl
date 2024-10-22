package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;

import java.time.LocalDate;
import java.time.temporal.ChronoField;

public enum Period {
    YEAR, QUARTER, MONTH, WEEK, DAY;

    private static final double FIRST_TIMESTAMP = 1;
    private static final int ZERO_YEAR = 1900;
    private static final int FIRST_MONTH = 1;
    private static final int FIRST_DAY = 1;
    private static final int MONTHS_PER_YEAR = 12;
    private static final int MONTHS_PER_QUARTER = 3;
    private static final int DAYS_PER_WEEK = 7;

    /**
     * Finds a period by timestamp and returns the offset.
     */
    public double getOffset(double timestamp) {
        return switch (this) {
            case DAY -> getDayOffset(timestamp);
            case WEEK -> getWeekOffset(timestamp);
            case MONTH -> getMonthOffset(timestamp);
            case QUARTER -> getQuarterOffset(timestamp);
            case YEAR -> getYearOffset(timestamp);
        };
    }

    /**
     * Finds a period by offset and returns the timestamp from which the period starts.
     */
    public double getTimestamp(double offset) {
        return switch (this) {
            case DAY -> getDayTimestamp(offset);
            case WEEK -> getWeekTimestamp(offset);
            case MONTH -> getMonthTimestamp(offset);
            case QUARTER -> getQuarterTimestamp(offset);
            case YEAR -> getYearTimestamp(offset);
        };
    }

    public String format(double date) {
        if (Doubles.isError(date)) {
            return Doubles.toStringError(date);
        }

        LocalDate value = Dates.getLocalDate(date);
        return switch (this) {
            case YEAR -> Integer.toString(value.getYear());
            case QUARTER -> value.getYear() + "-Q" + ((value.getMonthValue() + 2) / 3);
            case MONTH -> {
                int month = value.getMonthValue();
                yield value.getYear() + (month < 10 ? "-M0" : "-M") + month;
            }
            case WEEK -> {
                int week = value.get(ChronoField.ALIGNED_WEEK_OF_YEAR);
                yield value.getYear() + (week < 10 ? "-W0" : "-W") + week;
            }
            case DAY -> value.toString();
        };
    }

    private static double getDayOffset(double timestamp) {
        return Math.floor(timestamp) - FIRST_TIMESTAMP;
    }

    private static double getWeekOffset(double timestamp) {
        return Math.floor(getDayOffset(timestamp) / DAYS_PER_WEEK);
    }

    private static double getMonthOffset(double timestamp) {
        return getYearOffset(timestamp) * MONTHS_PER_YEAR
                + Dates.getMonth(timestamp) - FIRST_MONTH /* months start from 1 */;
    }

    private static double getQuarterOffset(double serialDate) {
        return Math.floor(getMonthOffset(serialDate) / MONTHS_PER_QUARTER);
    }

    private static double getYearOffset(double serialDate) {
        return Dates.getYear(serialDate) - ZERO_YEAR;
    }

    private static double getDayTimestamp(double offset) {
        return offset + FIRST_TIMESTAMP;
    }

    private static double getWeekTimestamp(double offset) {
        return getDayTimestamp(offset * DAYS_PER_WEEK);
    }

    private static double getMonthTimestamp(double offset) {
        double monthOffset = offset % MONTHS_PER_YEAR;
        double year = Math.floor(offset / MONTHS_PER_YEAR) + ZERO_YEAR;
        return Dates.of(year, monthOffset + FIRST_MONTH, FIRST_DAY);
    }

    private static double getQuarterTimestamp(double offset) {
        return getMonthTimestamp(offset * MONTHS_PER_QUARTER);
    }

    private static double getYearTimestamp(double offset) {
        double year = offset + ZERO_YEAR;
        return Dates.of(year, FIRST_MONTH, FIRST_DAY);
    }
}
