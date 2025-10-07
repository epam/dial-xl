package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.dfp.Decimal64Utils;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileUtil;
import lombok.experimental.UtilityClass;

import java.math.RoundingMode;
import java.util.List;
import java.util.Locale;

@UtilityClass
public class FormatUtils {
    private static final String DECIMAL_PLACES_PARAM = "decimal places";

    public static final int MIN_TOTAL_DIGITS = 4;
    public static final Locale DEFAULT_LOCALE = Locale.US;
    public static final String ZEROS = "0".repeat(Decimal64Utils.MAX_EXPONENT);

    public ColumnFormat createFormat(String name, List<Object> args) {
        return switch (name) {
            case "general" -> {
                CompileUtil.verify(args.isEmpty(), "General formatting doesn't have arguments");

                yield GeneralFormat.INSTANCE;
            }
            case "currency" -> {
                CompileUtil.verify(args.size() == 2 || args.size() == 3,
                        "Number formatting requires 2 or 3 arguments: size, thousands separator (optional) and currency symbol. Got: %d",
                        args.size());

                String format = String.valueOf(args.get(0));
                boolean useThousandsSeparator = false;
                String symbol;
                if (args.size() == 3) {
                    useThousandsSeparator = args.get(1) instanceof Double value && value == 1
                        || ",".equals(String.valueOf(args.get(1)));
                    symbol = String.valueOf(args.get(2));
                } else {
                    symbol = String.valueOf(args.get(1));
                }

                yield new CurrencyFormat(format, useThousandsSeparator, symbol);
            }
            case "date" -> {
                CompileUtil.verify(args.size() == 1,
                        "Date formatting requires single argument: string pattern. Got: %d",
                        args.size());
                String pattern = String.valueOf(args.get(0));
                yield new DateFormat(pattern);
            }
            case "number" -> {
                CompileUtil.verify(args.size() == 1 || args.size() == 2,
                        "Number formatting requires 1 or 2 arguments: size and thousands separator (optional). Got: %d",
                        args.size());
                String decimalDigits = String.valueOf(args.get(0));
                boolean useThousandsSeparator = false;
                if (args.size() == 2) {
                    useThousandsSeparator = getThousandsSeparator(args.get(1));
                }

                yield new NumberFormat(decimalDigits, useThousandsSeparator);
            }
            case "percentage" -> {
                CompileUtil.verify(args.size() == 1 || args.size() == 2,
                        "Percentage formatting requires 1 or 2 arguments: size and thousands separator (optional). Got: %d",
                        args.size());
                String format = String.valueOf(args.get(0));
                boolean useThousandsSeparator = false;
                if (args.size() == 2) {
                    useThousandsSeparator = getThousandsSeparator(args.get(1));
                }

                yield new PercentageFormat(format, useThousandsSeparator);
            }
            case "scientific" -> {
                CompileUtil.verify(args.size() == 1,
                        "Scientific formatting requires 1 argument: format. Got: %d",
                        args.size());
                int format = castToInteger(args.get(0), name, DECIMAL_PLACES_PARAM);

                yield new ScientificFormat(format);
            }
            default -> throw new CompileError("Unknown column format: %s".formatted(name));
        };
    }

    private int castToInteger(Object parameter, String formatName, String parameterName) {
        if (parameter instanceof Double value && !value.isNaN()) {
            int intPart = value.intValue();
            CompileUtil.verify(value == intPart, "Parameter %s is not an integer number", parameterName);

            return intPart;
        }

        throw new CompileError(
                "Wrong parameter %s for format %s, expected an integer number".formatted(parameterName, formatName));
    }

    public boolean getThousandsSeparator(Object parameter) {
        return parameter instanceof Double value && value == 1 || ",".equals(String.valueOf(parameter));
    }

    public int getDigitCount(long value) {
        if (value > 0) {
            value = -value;
        }
        long p = -10;
        int maxCount = 19;
        for (int i = 1; i < maxCount; i++) {
            if (value > p) {
                return i;
            }

            p = 10 * p;
        }

        return maxCount;
    }

    public int getOrder(long l) {
        long unscaledValue = Decimal64Utils.getUnscaledValue(l);
        int scale = Decimal64Utils.getScale(l);
        return FormatUtils.getDigitCount(unscaledValue) - scale;
    }

    public long round(long l, int significantDigits) {
        int order = getOrder(l);
        return Decimal64Utils.round(l, significantDigits - order, RoundingMode.HALF_UP);
    }

    public void formatGroups(StringBuilder builder, int intPartIndex, int decimalPointIndex) {
        int intPartSize = decimalPointIndex - intPartIndex;
        int groupCount = Math.floorDiv(intPartSize - 1, 3);
        if (groupCount > 0) {
            int originalLength = builder.length();
            int originalIndex = originalLength;
            int newIndex = originalIndex + groupCount;
            builder.setLength(newIndex);
            for (int i = decimalPointIndex; i < originalLength; ++i) {
                char ch = builder.charAt(--originalIndex);
                builder.setCharAt(--newIndex, ch);
            }
            for (int i = 0; i < groupCount; ++i) {
                for (int j = 0; j < 3; ++j) {
                    char ch = builder.charAt(--originalIndex);
                    builder.setCharAt(--newIndex, ch);
                }
                builder.setCharAt(--newIndex, ',');
            }
        }
    }

    static int getMultiplierExponent(String arg) {
        return switch (arg) {
            case "K" -> 3;
            case "M" -> 6;
            case "B" -> 9;
            default -> 0;
        };
    }
}
