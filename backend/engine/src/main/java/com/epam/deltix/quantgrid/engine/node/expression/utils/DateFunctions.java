package com.epam.deltix.quantgrid.engine.node.expression.utils;

import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;
import lombok.experimental.UtilityClass;

@UtilityClass
public class DateFunctions {
    public final int SECONDS_IN_DAY = 24 * 60 * 60;
    public final int MINUTES_IN_DAY = 24 * 60;
    public final int HOURS_IN_DAY = 24;

    public double workDay(double date, double days) {
        if (Doubles.isError(date)) {
            return date;
        }

        if (Doubles.isError(days)) {
            return days;
        }

        if (Doubles.isEmpty(date)) {
            date = 0.0;
        }

        if (Doubles.isEmpty(days)) {
            days = 0.0;
        }

        int roundedDays = (int) Math.round(days);

        double currentDate = (int) Math.floor(date);
        int dayOfWeek = Dates.getLocalDate(currentDate).getDayOfWeek().getValue() - 1;

        if (roundedDays > 0) {
            if (dayOfWeek > 4) {
                currentDate += (7 - dayOfWeek);
                dayOfWeek = 0;
                --roundedDays;
            }

            int numberOfWeeks = roundedDays / 5;
            currentDate += numberOfWeeks * 7;
            roundedDays %= 5;

            while (roundedDays > 0) {
                ++currentDate;

                ++dayOfWeek;
                if (dayOfWeek == 7) {
                    dayOfWeek = 0;
                }

                if (dayOfWeek <= 4) {
                    --roundedDays;
                }
            }
        } else if (roundedDays < 0) {
            roundedDays = Math.abs(roundedDays);

            if (dayOfWeek > 4) {
                currentDate -= (dayOfWeek - 4);
                dayOfWeek = 4;

                --roundedDays;
            }

            int numberOfWeeks = roundedDays / 5;
            currentDate -= numberOfWeeks * 7;
            roundedDays %= 5;

            while (roundedDays > 0) {
                --currentDate;

                --dayOfWeek;
                if (dayOfWeek == -1) {
                    dayOfWeek = 6;
                }

                if (dayOfWeek <= 4) {
                    --roundedDays;
                }
            }
        }

        return currentDate;
    }
}
