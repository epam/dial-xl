package com.epam.deltix.quantgrid.engine.value;

import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import org.jetbrains.annotations.Nullable;

public interface PeriodSeriesColumn extends Column {

    PeriodSeriesColumn EMPTY = new PeriodSeriesDirectColumn();

    @Nullable PeriodSeries get(long index);
}
