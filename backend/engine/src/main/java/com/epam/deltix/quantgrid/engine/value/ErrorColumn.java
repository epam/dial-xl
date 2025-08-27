package com.epam.deltix.quantgrid.engine.value;

/**
 * The column is used to represent an error in nodes that aggregate multiple columns,
 * and a failure in one column shouldn’t directly affect the others (e.g., SelectLocal, PivotLocal).
 * @param message Error message
 * @param size Column size
 */
public record ErrorColumn(String message, long size) implements Column {
    public ErrorColumn withSize(long newSize) {
        return new ErrorColumn(message, newSize);
    }
}
