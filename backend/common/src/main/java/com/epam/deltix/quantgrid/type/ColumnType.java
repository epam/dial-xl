package com.epam.deltix.quantgrid.type;

public enum ColumnType {
    DOUBLE, STRING, PERIOD_SERIES, STRUCT;

    public boolean isDouble() {
        return this == DOUBLE;
    }

    public boolean isString() {
        return this == STRING;
    }

    public boolean isPeriodSeries() {
        return this == PERIOD_SERIES;
    }

    public static boolean isCommon(ColumnType left, ColumnType right) {
        return common(left, right) != null;
    }

    public static ColumnType common(ColumnType left, ColumnType right) {
        if (left == null) {
            return right;
        }

        if (right == null) {
            return left;
        }

        if (left == right) {
            return left;
        }

        if (left == PERIOD_SERIES || right == PERIOD_SERIES) {
            return null;
        }

        if (left == STRUCT || right == STRUCT) {
            return null;
        }

        return STRING;
    }
}
