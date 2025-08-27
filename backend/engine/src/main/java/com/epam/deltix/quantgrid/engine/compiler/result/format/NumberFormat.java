package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.dfp.Decimal64Utils;
import com.epam.deltix.quantgrid.util.Formatter;
import com.epam.deltix.quantgrid.util.Strings;

import java.math.RoundingMode;
import java.util.Objects;

public record NumberFormat(String format, boolean useThousandsSeparator) implements ColumnFormat {
    @Override
    public ColumnFormat merge(ColumnFormat other) {
        if (other instanceof NumberFormat numberFormat) {
            String resolveFormat = resolveFormat(format, numberFormat.format);
            return new NumberFormat(
                    resolveFormat, useThousandsSeparator || numberFormat.useThousandsSeparator);
        }

        return ColumnFormat.super.merge(other);
    }

    @Override
    public Formatter createFormatter() {
        return createFormatter(format, useThousandsSeparator, "", "");
    }

    // Priorities (from highest to lowest):
    // 1. Decimal places (greater is higher).
    // 2. Total digits (smaller is higher).
    // 3. Multiplier (finer is higher: K > M > B).
    public static String resolveFormat(String first, String second) {
        if (Objects.equals(first, second)) {
            return first;
        }

        int firstExp = FormatUtils.getMultiplierExponent(first);
        int secondExp = FormatUtils.getMultiplierExponent(second);
        if (firstExp < secondExp) {
            return first;
        }
        if (firstExp > secondExp) {
            return second;
        }

        int firstNumber = (int) Double.parseDouble(first);
        int secondNumber = (int) Double.parseDouble(second);
        if (firstNumber < 0 && secondNumber < 0) {
            return firstNumber < secondNumber ? first : second;
        }

        return firstNumber > secondNumber ? first : second;
    }

    public static Formatter createFormatter(
            String format, boolean useThousandsSeparator, String prefix, String suffix) {
        int exp = FormatUtils.getMultiplierExponent(format);
        if (exp != 0) {
            return withMultiplier(exp, format, useThousandsSeparator, prefix, suffix);
        }
        int number = (int) Double.parseDouble(format);
        if (number < 0) {
            int totalDigits = Math.max(
                    FormatUtils.MIN_TOTAL_DIGITS, Math.min(Decimal64Utils.MAX_SIGNIFICAND_DIGITS, -number));
            return withTotalDigits(totalDigits, useThousandsSeparator, prefix, suffix);
        }

        int decimalDigits = Math.min(-Decimal64Utils.MIN_EXPONENT, number);
        return withDecimalDigits(decimalDigits, useThousandsSeparator, prefix, suffix);
    }

    private static Formatter withTotalDigits(
            int totalDigits, boolean useThousandsSeparator, String prefix, String suffix) {
        String zero = prefix + "0" + suffix;
        return value -> {
            long l = Decimal64Utils.fromDouble(value);
            if (Decimal64Utils.isInfinity(l)) {
                return Strings.ERROR_NA;
            }
            if (Decimal64Utils.isZero(l)) {
                return zero;
            }
            int order = FormatUtils.getOrder(l);
            int remainder = getRemainder(order, totalDigits);
            l = Decimal64Utils.round(l, -remainder, RoundingMode.HALF_UP);
            order = FormatUtils.getOrder(l);
            remainder = getRemainder(order, totalDigits);

            if (-remainder < totalDigits) {
                if (remainder <= 0) {
                    StringBuilder builder = new StringBuilder(prefix);
                    Decimal64Utils.appendTo(l, builder);
                    if (useThousandsSeparator) {
                        int decimalPointIndex = builder.indexOf(".");
                        if (decimalPointIndex == -1) {
                            decimalPointIndex = builder.length();
                        }
                        int intPartIndex = (Decimal64Utils.isNegative(l) ? 1 : 0) + prefix.length();
                        FormatUtils.formatGroups(builder, intPartIndex, decimalPointIndex);
                    }
                    builder.append(suffix);
                    return builder.toString();
                }

                if (remainder <= 3) {
                    return formatWithMultiplier(
                            l, 3, "K", remainder, useThousandsSeparator, zero, prefix, suffix);
                }

                if (remainder <= 6) {
                    return formatWithMultiplier(
                            l, 6, "M", remainder, useThousandsSeparator, zero, prefix, suffix);
                }

                if (remainder <= 9) {
                    return formatWithMultiplier(
                            l, 9, "B", remainder, useThousandsSeparator, zero, prefix, suffix);
                }
            }

            return ScientificFormat.formatWithTotalDigits(l, order - 1, prefix, suffix);
        };
    }

    private static int getRemainder(int order, int totalDigits) {
        if (order < 0 && -order < totalDigits - 1 /* 1 for zero before decimal point (0.*) */) {
            return 1 - totalDigits;
        }

        if (order >= 0 && order <= totalDigits + 9) {
            return order - totalDigits;
        }

        return order - totalDigits + FormatUtils.getDigitCount(order - 1 /* exponent */);
    }

    private static Formatter withDecimalDigits(
            int decimalDigits, boolean useThousandsSeparator, String prefix, String suffix) {
        String zero = prefix
                + (decimalDigits > 0 ? "0." + FormatUtils.ZEROS.substring(0, decimalDigits) : "0")
                + suffix;
        return value -> {
            long l = Decimal64Utils.fromDouble(value);
            if (Decimal64Utils.isInfinity(l)) {
                return Strings.ERROR_NA;
            }

            l = Decimal64Utils.round(l, decimalDigits, RoundingMode.HALF_UP);
            int scale = Decimal64Utils.getScale(l);
            long unscaledValue = Decimal64Utils.getUnscaledValue(l);
            if (unscaledValue == 0) {
                return zero;
            }

            StringBuilder builder = new StringBuilder(prefix);
            formatNumber(builder, unscaledValue, scale, decimalDigits, useThousandsSeparator);
            builder.append(suffix);

            return builder.toString();
        };
    }

    private static Formatter withMultiplier(
            int exponent, String multiplier, boolean useThousandsSeparator, String prefix, String suffix) {
        String zero = prefix + "0" + suffix;
        return value -> {
            long l = Decimal64Utils.fromDouble(value);
            if (Decimal64Utils.isInfinity(l)) {
                return Strings.ERROR_NA;
            }
            return formatWithMultiplier(
                    l, exponent, multiplier, 1, useThousandsSeparator, zero, prefix, suffix);
        };
    }

    private static String formatWithMultiplier(
            long l,
            int exponent,
            String multiplier,
            int maxDecimalDigits,
            boolean useThousandsSeparator,
            String zero,
            String prefix,
            String suffix) {
        l = Decimal64Utils.scaleByPowerOfTen(l, -exponent);
        l = Decimal64Utils.round(l, maxDecimalDigits, RoundingMode.HALF_UP);
        if (Decimal64Utils.isZero(l)) {
            return zero;
        }

        StringBuilder builder = new StringBuilder(prefix);
        Decimal64Utils.appendTo(l, builder);

        if (useThousandsSeparator) {
            int decimalPointIndex = builder.indexOf(".");
            if (decimalPointIndex == -1) {
                decimalPointIndex = builder.length();
            }
            int intPartIndex = (Decimal64Utils.isNegative(l) ? 1 : 0) + prefix.length();
            FormatUtils.formatGroups(builder, intPartIndex, decimalPointIndex);
        }
        builder.append(multiplier);
        builder.append(suffix);

        return builder.toString();
    }

    public static void formatNumber(
            StringBuilder builder, long unscaledValue, int scale, int decimalDigits, boolean useThousandsSeparator) {
        int offset = builder.length();
        builder.append(unscaledValue);
        if (scale > decimalDigits) {
            builder.setLength(builder.length() - scale + decimalDigits);
            scale = decimalDigits;
        }

        if (scale > 0) {
            builder.insert(builder.length() - scale, '.');
        } else {
            builder.append(FormatUtils.ZEROS, 0, -scale);
            scale = 0;
            if (decimalDigits > 0) {
                builder.append(".");
            }
        }
        builder.append(FormatUtils.ZEROS, 0, decimalDigits - scale);

        if (useThousandsSeparator) {
            int decimalPointIndex = builder.length() - (decimalDigits > 0 ? decimalDigits + 1 : 0);
            int intPartIndex = offset + (unscaledValue < 0 ? 1 : 0);
            FormatUtils.formatGroups(builder, intPartIndex, decimalPointIndex);
        }
    }


    @Override
    public String toString() {
        return "Number,[" + format + "," + useThousandsSeparator + "]";
    }
}
