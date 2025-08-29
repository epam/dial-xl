package com.epam.deltix.quantgrid.util;

import lombok.experimental.UtilityClass;

@UtilityClass
public class Strings {

    public static final String EMPTY = "";
    public static final String ERROR_NA = null;

    public static boolean isEmpty(String value) {
        return value != null && value.isEmpty();
    }

    public static boolean isNa(String value) {
        return value == null;
    }

    public static boolean isError(String value) {
        return value == null;
    }

    public double toDoubleError(String value) {
        if (value == null) {
            return Doubles.ERROR_NA;
        }

        throw new IllegalArgumentException("Not an error: " + value);
    }

    public String toString(String value) {
        return value == null ? "N/A" : value;
    }
}