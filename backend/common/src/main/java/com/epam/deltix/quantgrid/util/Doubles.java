package com.epam.deltix.quantgrid.util;

import lombok.experimental.UtilityClass;

@UtilityClass
public class Doubles {

    private static final long EMPTY_BITS = 0x7ff8000000000000L;
    private static final long ERROR_NA_BITS = 0x7ff8000000000001L;

    public static final double EMPTY = Double.longBitsToDouble(EMPTY_BITS);
    public static final double ERROR_NA = Double.longBitsToDouble(ERROR_NA_BITS);

    public static boolean isEmpty(double value) {
        return Double.doubleToRawLongBits(value) == EMPTY_BITS;
    }

    public static boolean isNa(double value) {
        return Double.doubleToRawLongBits(value) == ERROR_NA_BITS;
    }

    public static boolean isError(double value) {
        return Double.isNaN(value) && !isEmpty(value);
    }

    public static boolean isValue(double value) {
        return !Double.isNaN(value);
    }

    public static double normalizeNaN(double value) {
        return Double.isNaN(value) ? ERROR_NA : value;
    }

    public static void normalizeNaNs(double[] values) {
        for (int i = 0; i < values.length; i++) {
            values[i] = normalizeNaN(values[i]);
        }
    }

    public String toStringError(double value) {
        long bits = Double.doubleToRawLongBits(value);

        if (bits == ERROR_NA_BITS) {
            return Strings.ERROR_NA;
        }

        throw new IllegalArgumentException("Not an error: " + bits);
    }

    public static String toString(double value) {
        if (isValue(value)) {
            return Double.toString(value);
        }

        if (isEmpty(value)) {
            return "";
        }

        return toStringError(value);
    }
}