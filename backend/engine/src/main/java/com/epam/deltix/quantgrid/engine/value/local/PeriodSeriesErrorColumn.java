package com.epam.deltix.quantgrid.engine.value.local;

public class PeriodSeriesErrorColumn extends PeriodSeriesLambdaColumn {

    public PeriodSeriesErrorColumn(RuntimeException error, long size) {
        super(index -> {
            throw error;
        }, size);
    }
}