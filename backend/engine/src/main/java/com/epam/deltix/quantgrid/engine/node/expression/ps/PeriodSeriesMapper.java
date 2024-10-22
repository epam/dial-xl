package com.epam.deltix.quantgrid.engine.node.expression.ps;

import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.quanthub.scripting.models.common.period.TimePeriod;
import com.epam.quanthub.scripting.models.data.SimpleTimeSeriesData;
import com.epam.quanthub.scripting.models.data.TimeValuePoint;
import com.epam.quanthub.scripting.models.data.iterator.DateUtils;
import com.epam.quanthub.scripting.models.data.iterator.DateWithPeriod;
import com.epam.quanthub.scripting.models.functions.Decimal;
import com.epam.quanthub.tslib.TimeSeriesData;
import com.epam.quanthub.tslib.TimeSeriesUtils;
import lombok.experimental.UtilityClass;

import java.time.LocalDate;
import java.util.Iterator;

@UtilityClass
public class PeriodSeriesMapper {

    public TimeSeriesData<Decimal> toTimeSeriesData(PeriodSeries periodSeries) {
        Period qgPeriod = periodSeries.getPeriod();
        com.epam.quanthub.scripting.models.common.period.Period qhPeriod = toQhPeriod(qgPeriod);

        double qgOffset = periodSeries.getOffset();
        double startTimestamp = qgPeriod.getTimestamp(qgOffset);
        LocalDate startLocalDate = Dates.getLocalDate(startTimestamp);

        DateWithPeriod dateWithPeriod = new DateWithPeriod(startLocalDate, qhPeriod);
        double[] values = periodSeries.getValues().toArray();

        return TimeSeriesUtils.newTimeSeriesData(dateWithPeriod, values);
    }

    public PeriodSeries toPeriodSeries(SimpleTimeSeriesData<Decimal> timeSeriesData) {
        com.epam.quanthub.scripting.models.common.period.Period qhPeriod = timeSeriesData.getPeriod();
        Period qgPeriod = toQgPeriod(qhPeriod);
        if (timeSeriesData.isEmpty()) {
            return PeriodSeries.empty(qgPeriod);
        }

        Iterator<TimeValuePoint<Decimal>> pointIterator = timeSeriesData.iterator();
        double[] values = new double[timeSeriesData.size()];
        int valueIndex = 0;
        TimePeriod currentTimePeriod = null;
        while (pointIterator.hasNext()) {
            TimeValuePoint<Decimal> point = pointIterator.next();
            TimePeriod timePeriod = point.getTimePeriod();
            if (currentTimePeriod != null
                    && DateUtils.diff(timePeriod.getBegin(), currentTimePeriod.getBegin(), qhPeriod) != 1) {
                throw new IllegalArgumentException("Provided time series contain gaps");
            }

            Decimal value = point.getValue();
            values[valueIndex++] = value.doubleValue();
            currentTimePeriod = timePeriod;
        }

        LocalDate startDate = timeSeriesData.getFirstValidDate();
        double startOffset = qgPeriod.getOffset(Dates.from(startDate.atStartOfDay()));

        return new PeriodSeries(qgPeriod, startOffset, values);
    }

    private com.epam.quanthub.scripting.models.common.period.Period toQhPeriod(Period period) {
        return switch (period) {
            case DAY -> com.epam.quanthub.scripting.models.common.period.Period.DAILY_SEVEN_DAYS;
            case WEEK -> com.epam.quanthub.scripting.models.common.period.Period.WEEKLY;
            case MONTH -> com.epam.quanthub.scripting.models.common.period.Period.MONTHLY;
            case QUARTER -> com.epam.quanthub.scripting.models.common.period.Period.QUARTERLY;
            case YEAR -> com.epam.quanthub.scripting.models.common.period.Period.ANNUALLY;
        };
    }

    private Period toQgPeriod(com.epam.quanthub.scripting.models.common.period.Period period) {
        return switch (period) {
            case DAILY_SEVEN_DAYS -> Period.DAY;
            case WEEKLY -> Period.WEEK;
            case MONTHLY -> Period.MONTH;
            case QUARTERLY -> Period.QUARTER;
            case ANNUALLY -> Period.YEAR;
            default -> throw new UnsupportedOperationException("Unsupported period " + period);
        };
    }

    public boolean isEmpty(PeriodSeries ps) {
        return Doubles.isNa(ps.getOffset()) && (ps.getValues().size() == 0);
    }
}
