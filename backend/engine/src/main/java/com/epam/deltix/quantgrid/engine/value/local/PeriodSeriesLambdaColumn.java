package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;

public class PeriodSeriesLambdaColumn implements PeriodSeriesColumn {

    private final Lambda lambda;
    private final long size;

    public PeriodSeriesLambdaColumn(Lambda lambda, long size) {
        this.lambda = lambda;
        this.size = size;
    }

    @Override
    public long size() {
        return size;
    }

    @Override
    public PeriodSeries get(long index) {
        return lambda.map(index);
    }

    public interface Lambda {

        PeriodSeries map(long index);
    }
}