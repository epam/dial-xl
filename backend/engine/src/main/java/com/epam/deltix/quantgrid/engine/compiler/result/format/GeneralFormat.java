package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.dfp.Decimal64Utils;
import com.epam.deltix.quantgrid.util.Formatter;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

import java.math.RoundingMode;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class GeneralFormat implements ColumnFormat {
    private static final long ELEVEN_DIGIT_INTEGER = Decimal64Utils.fromLong(10_000_000_000L);
    private static final long EIGHTEEN_DIGIT_INTEGER = Decimal64Utils.fromLong(100_000_000_000_000_000L);
    private static final long SMALL_NUMBER = Decimal64Utils.fromDouble(1e-7);
    private static final int MAX_DEFAULT_SIGNIFICANT_DIGITS = 10;
    private static final int MAX_SCIENTIFIC_SIGNIFICANT_DIGITS = 5;

    public static final GeneralFormat INSTANCE = new GeneralFormat();

    @Override
    public Formatter createFormatter() {
        return value -> {
            long l = Decimal64Utils.fromDouble(value);
            if (Decimal64Utils.isInfinity(l)) {
                return Decimal64Utils.toString(l);
            }

            if (Decimal64Utils.isZero(l)) {
                return "0";
            }

            long abs = Decimal64Utils.abs(l);
            if (Decimal64Utils.isGreaterOrEqual(abs, ELEVEN_DIGIT_INTEGER)) {
                return Decimal64Utils.isLess(abs, EIGHTEEN_DIGIT_INTEGER)
                        ? formatBillions(l)
                        : formatScientific(l);
            }

            if (Decimal64Utils.isLess(abs, SMALL_NUMBER)) {
                return formatScientific(l);
            }

            return formatDefault(l);
        };
    }

    private static String formatScientific(long l) {
        l = FormatUtils.round(l, MAX_SCIENTIFIC_SIGNIFICANT_DIGITS);
        int exponent = ScientificFormat.getExponent(l);
        l = Decimal64Utils.scaleByPowerOfTen(l, -exponent);

        StringBuilder builder = new StringBuilder();
        Decimal64Utils.appendTo(l, builder);
        builder.append('E');
        builder.append(exponent);
        return builder.toString();
    }

    private static String formatBillions(long l) {
        l = Decimal64Utils.scaleByPowerOfTen(l, -9);
        l = Decimal64Utils.round(l, 1, RoundingMode.HALF_UP);
        StringBuilder builder = new StringBuilder();
        format(builder, l);
        builder.append('B');
        return builder.toString();
    }

    private static String formatDefault(long l) {
        l = FormatUtils.round(l, MAX_DEFAULT_SIGNIFICANT_DIGITS);
        StringBuilder builder = new StringBuilder();
        format(builder, l);
        return builder.toString();
    }

    private static void format(StringBuilder builder, long l) {
        Decimal64Utils.appendTo(l, builder);
        int decimalPointIndex = builder.indexOf(".");
        if (decimalPointIndex == -1) {
            decimalPointIndex = builder.length();
        }
        int intPartIndex = Decimal64Utils.isNegative(l) ? 1 : 0;
        FormatUtils.formatGroups(builder, intPartIndex, decimalPointIndex);
    }

    @Override
    public String toString() {
        return "Generic";
    }
}
