package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.value.DoubleColumn;

public class DoubleLambdaColumn implements DoubleColumn {

    private final Lambda lambda;
    private final long size;

    public DoubleLambdaColumn(Lambda lambda, long size) {
        this.lambda = lambda;
        this.size = size;
    }

    @Override
    public long size() {
        return size;
    }

    @Override
    public double get(long index) {
        return lambda.map(index);
    }

    public interface Lambda {

        double map(long index);
    }
}