package com.epam.deltix.quantgrid.engine.value;

public record ErrorColumn(String message, long size) implements Column {
    public ErrorColumn withSize(long newSize) {
        return new ErrorColumn(message, newSize);
    }
}
