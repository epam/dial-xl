package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.value.StringColumn;

public class StringLambdaColumn implements StringColumn {

    private final Lambda lambda;
    private final long size;

    public StringLambdaColumn(Lambda lambda, long size) {
        this.lambda = lambda;
        this.size = size;
    }

    @Override
    public long size() {
        return size;
    }

    @Override
    public String get(long index) {
        return lambda.map(index);
    }

    public interface Lambda {

        String map(long index);
    }
}