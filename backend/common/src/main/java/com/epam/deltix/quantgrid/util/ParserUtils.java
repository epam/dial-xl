package com.epam.deltix.quantgrid.util;

import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.type.EscapeType;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.math.NumberUtils;
import org.jetbrains.annotations.Nullable;

@UtilityClass
public class ParserUtils {
    public ColumnType inferType(@Nullable String value, ColumnType type) {
        if (isNa(value) || isMissing(value)) {
            return type;
        }

        boolean missing = (type == null);

        if (missing || type == ColumnType.BOOLEAN) {
            if (isBoolean(value)) {
                return ColumnType.BOOLEAN;
            } else {
                type = missing ? ColumnType.DATE : ColumnType.STRING;
            }
        }

        if (type == ColumnType.DATE) {
            if (Doubles.isValue(Dates.from(value))) {
                return ColumnType.DATE;
            } else {
                type = missing ? ColumnType.DOUBLE : ColumnType.STRING;
            }
        }

        if (type == ColumnType.DOUBLE && NumberUtils.isParsable(value)) {
            return ColumnType.DOUBLE;
        }

        return ColumnType.STRING;
    }

    public double parseBoolean(String value) {
        if (isNa(value)) {
            return Doubles.ERROR_NA;
        }

        if (isMissing(value)) {
            return Doubles.EMPTY;
        }

        if (value.equalsIgnoreCase("false")) {
            return 0;
        } else if (value.equalsIgnoreCase("true")) {
            return 1;
        } else {
            throw new IllegalArgumentException("Failed to parse boolean");
        }
    }

    public double parseLong(String value) {
        if (isNa(value)) {
            return Doubles.ERROR_NA;
        }

        if (isMissing(value)) {
            return Doubles.EMPTY;
        }

        return Long.parseLong(value);
    }

    public double parseDouble(String value) {
        if (isNa(value)) {
            return Doubles.ERROR_NA;
        }

        if (isMissing(value)) {
            return Doubles.EMPTY;
        }

        return Double.parseDouble(value);
    }

    public String parseString(String value) {
        return isNa(value) ? null : value;
    }

    private boolean isNa(String value) {
        return value == null || value.equalsIgnoreCase("n/a") || value.equalsIgnoreCase("null");
    }

    private boolean isMissing(String value) {
        return value.isEmpty();
    }

    private boolean isBoolean(String item) {
        return item.equalsIgnoreCase("false") || item.equalsIgnoreCase("true");
    }

    public static String decodeEscapes(String str, EscapeType escapeType) {
        final StringBuilder decodedStr = new StringBuilder();

        int i = 0;
        for (; i < str.length() - 1; ++i) {
            if (str.charAt(i) == '\'' && isEscapeChar(str.charAt(i + 1), escapeType)) {
                ++i;
            }

            decodedStr.append(str.charAt(i));
        }

        if (i < str.length()) {
            decodedStr.append(str.charAt(str.length() - 1));
        }

        return decodedStr.toString();
    }

    private static boolean isEscapeChar(char ch, EscapeType escapeType) {
        return switch (escapeType) {
            case STRING -> switch (ch) {
                case '\'', '"' -> true;
                default -> false;
            };
            case MULTIWORD_TABLE -> switch (ch) {
                case '\'' -> true;
                default -> false;
            };
            case FIELD -> switch (ch) {
                case '\'', '[', ']' -> true;
                default -> false;
            };
        };
    }
}
