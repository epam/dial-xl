package com.epam.deltix.quantgrid.engine.value.local;

public class DoubleErrorColumn extends DoubleLambdaColumn {

    public DoubleErrorColumn(RuntimeException error, long size) {
        super(index -> {
            throw error;
        }, size);
    }
}