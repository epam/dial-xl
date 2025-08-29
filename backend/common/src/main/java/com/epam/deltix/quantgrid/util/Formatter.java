package com.epam.deltix.quantgrid.util;

public interface Formatter {
    Formatter LOSSLESS =  value -> {
        long integer = (long) value;
        // Double.toString switches to scientific notation for absolute values >= 1e7,
        // so for integer values with |value| < 1e7, we output as a long to avoid ".0".
        return integer == value && Math.abs(value) < 1e7
                ? Long.toString(integer)
                : Double.toString(value);
    };

    String apply(double value);
}
