package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import lombok.RequiredArgsConstructor;
import lombok.Value;

/**
 * The current design:
 * 1) Always sorted by period.
 * 2) No gaps in periods.
 * 3) Period is not stored, only the offset of the earliest period.
 *
 * <p>The offset is the number of periods since 1900: 2001 -> 101, 2001Q3 -> 406.
 */
@Value
@RequiredArgsConstructor
public class PeriodSeries {
    Period period;
    double offset;
    DoubleColumn values;

    public PeriodSeries(Period period, double offset, double... values) {
        this(period, offset, new DoubleDirectColumn(values));
    }

    public PeriodSeries(Period period, double offset, DoubleArrayList values) {
        this(period, offset, new DoubleDirectColumn(values));
    }

    public static PeriodSeries empty(Period period) {
        return new PeriodSeries(period, Double.NaN, DoubleColumn.EMPTY);
    }
}
