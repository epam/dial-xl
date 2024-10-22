package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.utils.DateFunctions;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.List;

public class DateRangeLocal extends Plan1<Table, Table> {
    public enum DateRangeType {
        SECOND(1),
        MINUTE(2),
        HOUR(3),
        DAY(4),
        WORKDAY(5),
        WEEK(6),
        MONTH(7),
        QUARTER(8),
        YEAR(9);

        private final int id;

        DateRangeType(int id) {
            this.id = id;
        }

        public int getId() {
            return id;
        }

        public static DateRangeType fromId(int id) {
            for (DateRangeType dateRangeType : DateRangeType.values()) {
                if (dateRangeType.getId() == id) {
                    return dateRangeType;
                }
            }
            return null;
        }
    }

    public DateRangeLocal(Plan source, Expression date1, Expression date2, Expression increment, Expression dateType) {
        super(source, List.of(date1, date2, increment, dateType));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        Schema source = Schema.inputs(this, 0);
        Schema substring = Schema.of(ColumnType.DATE);
        return new Meta(Schema.of(source, substring));
    }

    @Override
    public Table execute(Table table) {
        DoubleColumn date1Column = expression(0, 0).evaluate();
        Util.verify(date1Column.size() == table.size());
        DoubleColumn date2Column = expression(0, 1).evaluate();
        Util.verify(date2Column.size() == table.size());
        DoubleColumn incrementColumn = expression(0, 2).evaluate();
        Util.verify(incrementColumn.size() == table.size());
        DoubleColumn dateTypeColumn = expression(0, 3).evaluate();
        Util.verify(dateTypeColumn.size() == table.size());

        int size = Util.toIntSize(table.size());
        LongArrayList refs = new LongArrayList(size);
        DoubleArrayList days = new DoubleArrayList(size);

        for (int i = 0; i < size; i++) {
            double date1 = date1Column.get(i);
            double date2 = date2Column.get(i);
            double originalIncrement = incrementColumn.get(i);
            double originalDateType = dateTypeColumn.get(i);

            if (!Doubles.isValue(date1) || !Doubles.isValue(date2) ||
                    !Doubles.isValue(originalIncrement) || !Doubles.isValue(originalDateType)) {
                continue;
            }

            double increment = (int) Math.round(originalIncrement);
            DateRangeType dateType = DateRangeType.fromId((int) Math.round(dateTypeColumn.get(i)));

            if (date1 > date2) {
                throw new IllegalArgumentException("Invalid function DATERANGE argument \"date1\" or \"date2\": expected \"date1\" is greater or equal to \"date2\"");
            }
            if (increment <= 0) {
                throw new IllegalArgumentException("Invalid function DATERANGE argument \"increment\": expected positive value of type INTEGER");
            }
            if (dateType == null) {
                throw new IllegalArgumentException("Invalid function DATERANGE argument \"date_type\": expected value of type INTEGER from 1 to 9");
            }

            int dayOfWeek;
            int startDay;
            double currentDay, currentMonth, currentYear, currentDate;

            switch (dateType) {
                case SECOND:
                    for (long j = (long) (date1 * DateFunctions.SECONDS_IN_DAY); j <= (long) (date2 * DateFunctions.SECONDS_IN_DAY); j += increment) {
                        refs.add(i);
                        days.add((double) j / DateFunctions.SECONDS_IN_DAY);
                    }

                    break;
                case MINUTE:
                    for (int j = (int) Math.ceil(date1 * DateFunctions.MINUTES_IN_DAY); j <= (int) (date2 * DateFunctions.MINUTES_IN_DAY); j += increment) {
                        refs.add(i);
                        days.add((double) j / DateFunctions.MINUTES_IN_DAY);
                    }

                    break;
                case HOUR:
                    for (int j = (int) Math.ceil(date1 * DateFunctions.HOURS_IN_DAY); j <= (int) (date2 * DateFunctions.HOURS_IN_DAY); j += increment) {
                        refs.add(i);
                        days.add((double) j / DateFunctions.HOURS_IN_DAY);
                    }

                    break;
                case DAY:
                    startDay = (int) Math.ceil(date1);

                    for (int j = startDay; j <= (int) date2; j += increment) {
                        refs.add(i);
                        days.add(j);
                    }

                    break;
                case WORKDAY:
                    startDay = (int) Math.ceil(date1);
                    dayOfWeek = Dates.getLocalDate(startDay).getDayOfWeek().getValue() - 1;

                    int remainingDaysBeforeAdd = 0;
                    for (int j = startDay; j <= (int) (date2); ++j, dayOfWeek = (dayOfWeek + 1) % 7) {
                        if (dayOfWeek > 4) {
                            continue;
                        }

                        if (remainingDaysBeforeAdd == 0) {
                            refs.add(i);
                            days.add(j);
                        }

                        ++remainingDaysBeforeAdd;
                        if (remainingDaysBeforeAdd == increment) {
                            remainingDaysBeforeAdd = 0;
                        }
                    }

                    break;
                case WEEK:
                    startDay = (int) Math.ceil(date1);
                    dayOfWeek = Dates.getLocalDate(startDay).getDayOfWeek().getValue() - 1;

                    for (int j = startDay + (6 - dayOfWeek); j <= (int) date2; j += 7 * increment) {
                        refs.add(i);
                        days.add(j);
                    }

                    break;
                case MONTH:
                    startDay = (int) Math.ceil(date1);

                    currentDay = Dates.getDay(startDay) - 1;
                    currentMonth = Dates.getMonth(startDay) - 1;
                    currentYear = Dates.getYear(startDay);
                    if (currentDay > 0) {
                        ++currentMonth;

                        if (currentMonth == 12) {
                            currentMonth = 0;
                            ++currentYear;
                        }
                    }

                    currentDate = Dates.of(currentYear, currentMonth + 1, 1);
                    while (currentDate <= (int) date2) {
                        refs.add(i);
                        days.add(currentDate);

                        currentMonth += increment;
                        if (currentMonth >= 12) {
                            currentYear += currentMonth / 12;
                            currentMonth = currentMonth % 12;
                        }

                        currentDate = Dates.of(currentYear, currentMonth + 1, 1);
                    }

                    break;
                case QUARTER:
                    startDay = (int) Math.ceil(date1);

                    currentDay = Dates.getDay(startDay) - 1;
                    currentMonth = Dates.getMonth(startDay) - 1;
                    currentYear = Dates.getYear(startDay);

                    if (currentMonth % 3 != 0 || currentDay > 0) {
                        if (currentMonth >= 8) {
                            ++currentYear;
                            currentMonth = 0;
                        } else {
                            ++currentMonth;
                            currentMonth += 3 - currentMonth % 3;
                        }
                    }

                    currentDate = Dates.of(currentYear, currentMonth + 1, 1);
                    while (currentDate <= (int) date2) {
                        refs.add(i);
                        days.add(currentDate);

                        currentMonth += 3 * increment;
                        if (currentMonth >= 12) {
                            currentYear += currentMonth / 12;
                            currentMonth = currentMonth % 12;
                        }

                        currentDate = Dates.of(currentYear, currentMonth + 1, 1);
                    }

                    break;
                case YEAR:
                    startDay = (int) Math.ceil(date1);

                    currentDay = Dates.getDay(startDay) - 1;
                    currentMonth = Dates.getMonth(startDay) - 1;
                    currentYear = Dates.getYear(startDay);

                    if (currentMonth > 0 || currentDay > 0) {
                        ++currentYear;
                    }

                    currentDate = Dates.of(currentYear, 1, 1);
                    while (currentDate <= (int) date2) {
                        refs.add(i);
                        days.add(currentDate);

                        currentYear += increment;
                        currentDate = Dates.of(currentYear, 1, 1);
                    }

                    break;
            }
        }

        Table left = LocalTable.indirectOf(table, refs);
        LocalTable right = new LocalTable(new DoubleDirectColumn(days));
        return LocalTable.compositeOf(left, right);
    }
}
