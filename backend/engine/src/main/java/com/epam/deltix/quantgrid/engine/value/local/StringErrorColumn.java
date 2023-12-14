package com.epam.deltix.quantgrid.engine.value.local;

public class StringErrorColumn extends StringLambdaColumn {

    public StringErrorColumn(RuntimeException error, long size) {
        super(index -> {
            throw error;
        }, size);
    }
}