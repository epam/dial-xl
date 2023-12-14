package com.epam.deltix.quantgrid.type;

import org.jetbrains.annotations.Nullable;

public enum ColumnType {
    DOUBLE, INTEGER, BOOLEAN, DATE, STRING, PERIOD_SERIES;

    public boolean isDouble() {
        return switch (this) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> true;
            default -> false;
        };
    }

    public boolean isString() {
        return this == STRING;
    }

    public boolean isPeriodSeries() {
        return this == PERIOD_SERIES;
    }

    public static boolean isClose(ColumnType left, ColumnType right) {
        return closest(left, right) != null;
    }

    /**
     * Tries to find the closest type, returns null in case of failure.
     */
    @Nullable
    public static ColumnType closest(ColumnType left, ColumnType right) {
        if (left == right) {
            return left;
        }

        if (left == null) {
            return right;
        }

        if (right == null) {
            return left;
        }

        if (left.isDouble() && right.isDouble()) {
            return DOUBLE;
        }

        return null;
    }

    public static ColumnType closest(double value) {
        return Double.isFinite(value) && value == Math.rint(value) ? INTEGER : DOUBLE;
    }
}
