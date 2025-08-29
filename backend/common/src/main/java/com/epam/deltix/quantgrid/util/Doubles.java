package com.epam.deltix.quantgrid.util;

import ch.randelshofer.fastdoubleparser.JavaDoubleParser;
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

    public String toString(double value) {
        return toString(value, Formatter.LOSSLESS);
    }

    public String toString(double value, Formatter formatter) {
        if (isValue(value)) {
            return formatter.apply(value);
        }

        if (isEmpty(value)) {
            return "";
        }

        return toStringError(value);
    }

    public double parseDouble(String text) {
        if (Strings.isError(text)) {
            return Strings.toDoubleError(text);
        }

        if (Strings.isEmpty(text)) {
            return Doubles.EMPTY;
        }

        try {
            return parseDoubleWithSuffix(removeValidCommas(text));
        } catch (NumberFormatException e) {
            return Doubles.ERROR_NA;
        }
    }

    private CharSequence removeValidCommas(String text) {
        if (text.length() < 4) {
            return text;
        }

        int position = 0;
        char ch = text.charAt(position);
        if (ch == '-' || ch == '+') {
            if (text.length() < 5) {
                return text;
            }
            ch = text.charAt(++position);
        }

        if (isNotDigit(ch)) {
            return text;
        }

        for (int i = 0; i < 3; ++i) {
            ch = text.charAt(++position);
            if (isNotDigit(ch)) {
                break;
            }
        }

        if (ch != ',') {
            return text;
        }

        StringBuilder result = new StringBuilder();
        result.append(text, 0, position);
        int digitCount = 0;
        while (++position < text.length()) {
            ch = text.charAt(position);
            if (ch == ',') {
                if (digitCount != 3) {
                    return text;
                }
                digitCount = 0;
            } else {
                if (isNotDigit(ch)) {
                    result.append(text, position, text.length());
                    break;
                }

                result.append(ch);
                ++digitCount;
            }
        }
        if (digitCount != 3) {
            return text;
        }

        return result;
    }

    private double parseDoubleWithSuffix(CharSequence number) {
        if (number.length() < 2) {
            return JavaDoubleParser.parseDouble(number);
        }

        int last = number.length() - 1;
        return switch (number.charAt(last)) {
            case 'K' -> JavaDoubleParser.parseDouble(number, 0, last) * 1_000;
            case 'M' -> JavaDoubleParser.parseDouble(number, 0, last) * 1_000_000;
            case 'B' -> JavaDoubleParser.parseDouble(number, 0, last) * 1_000_000_000;
            default -> JavaDoubleParser.parseDouble(number);
        };
    }

    private boolean isNotDigit(char ch) {
        return '0' > ch || ch > '9';
    }
}