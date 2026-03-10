package com.epam.deltix.quantgrid.engine.service.input;

public record Range(int startRow, int endRow, int startColumn, int endColumn) {
    public Range intersect(Range range) {
        return new Range(
                Math.max(range.startRow, startRow),
                Math.min(range.endRow, endRow),
                Math.max(range.startColumn, startColumn),
                Math.min(range.endColumn, endColumn));
    }

    public Range shift(Range offset) {
        return new Range(
                (int) Math.min(Integer.MAX_VALUE, (long) startRow + offset.startRow),
                (int) Math.min(Integer.MAX_VALUE, (long) endRow + offset.startRow),
                (int) Math.min(Integer.MAX_VALUE, (long) startColumn + offset.startColumn),
                (int) Math.min(Integer.MAX_VALUE, (long) endColumn + offset.startColumn));
    }
}
