package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.dfp.Decimal64Utils;
import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;

import java.math.RoundingMode;

public record ScientificFormat(int format) implements ColumnFormat {
    @Override
    public ColumnFormat merge(ColumnFormat other) {
        if (other instanceof ScientificFormat scientificFormat) {
            int resolveFormat = format < 0 && scientificFormat.format < 0
                    ? Math.min(format, scientificFormat.format)
                    : Math.max(format, scientificFormat.format);
            return new ScientificFormat(resolveFormat);
        }

        return ColumnFormat.super.merge(other);
    }

    @Override
    public Formatter createFormatter() {
        if (format < 0) {
            int totalDigits = Math.max(
                    FormatUtils.MIN_TOTAL_DIGITS, Math.min(Decimal64Utils.MAX_SIGNIFICAND_DIGITS, -format));
            return withTotalDigits(totalDigits);
        }

        return withDecimalDigits(Math.min(-Decimal64Utils.MIN_EXPONENT, this.format));
    }

    private static Formatter withDecimalDigits(int decimalDigits) {
        String zero = decimalDigits > 0
                ? "0." + FormatUtils.ZEROS.substring(0, decimalDigits) + "E+0"
                : "0E+0";
        return value -> {
            long l = Decimal64Utils.fromDouble(value);
            if (Decimal64Utils.isInfinity(l)) {
                return Strings.ERROR_NA;
            }
            if (Decimal64Utils.isZero(l)) {
                return zero;
            }

            l = FormatUtils.round(l, decimalDigits + 1);
            if (Decimal64Utils.isZero(l)) {
                return zero;
            }

            StringBuilder builder = new StringBuilder();
            long unscaledValue = Decimal64Utils.getUnscaledValue(l);
            builder.append(unscaledValue);
            int originalLength = builder.length();
            int decimalPointIndex = unscaledValue < 0 ? 2 : 1;
            int newLength = decimalPointIndex + decimalDigits;
            if (originalLength > newLength) {
                builder.setLength(newLength);
            } else {
                builder.append(FormatUtils.ZEROS, 0, newLength - originalLength);
            }
            if (decimalDigits > 0) {
                builder.insert(decimalPointIndex, '.');
            }
            builder.append('E');
            int exponent = getExponent(l);
            if (exponent >= 0) {
                builder.append('+');
            }
            builder.append(exponent);
            return builder.toString();
        };
    }

    private Formatter withTotalDigits(int totalDigits) {
        String zero = "0E+0";
        return value -> {
            long l = Decimal64Utils.fromDouble(value);
            if (Decimal64Utils.isInfinity(l)) {
                return Strings.ERROR_NA;
            }
            if (Decimal64Utils.isZero(l)) {
                return zero;
            }
            int exponent = getExponent(l);
            int exponentSize = FormatUtils.getDigitCount(exponent);
            l = Decimal64Utils.round(l, totalDigits - exponent - exponentSize - 1, RoundingMode.HALF_UP);
            exponent = getExponent(l);
            return formatWithTotalDigits(l, exponent, "", "");
        };
    }

    @Override
    public String toString() {
        return "Scientific,[" + format + "]";
    }

    public static String formatWithTotalDigits(long l, int exponent, String prefix, String suffix) {
        l = Decimal64Utils.scaleByPowerOfTen(l, -exponent);
        StringBuilder builder = new StringBuilder(prefix);
        Decimal64Utils.appendTo(l, builder);
        builder.append('E');
        if (exponent >= 0) {
            builder.append('+');
        }
        builder.append(exponent);
        builder.append(suffix);

        return builder.toString();
    }

    public static int getExponent(long l) {
        return FormatUtils.getOrder(l) - 1;
    }
}
