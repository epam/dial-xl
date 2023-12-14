package com.epam.deltix.quantgrid.util;

import com.epam.deltix.quantgrid.service.parser.OverrideValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.experimental.UtilityClass;
import org.apache.commons.lang3.math.NumberUtils;
import org.jetbrains.annotations.Nullable;

@UtilityClass
public class ParserUtils {

    public ColumnType inferType(@Nullable String value) {
        if (isValueMissing(value) || isNa(value)) {
            return null;
        }

        if (isBoolean(value)) {
            return ColumnType.BOOLEAN;
        } else if (!Double.isNaN(ExcelDateTime.from(value))) {
            return ColumnType.DATE;
            // TODO disable it for now and decide how to handle it later
//        } else if (StringUtils.isNumeric(value)) {
//            return ColumnType.INTEGER;
        } else if (NumberUtils.isCreatable(value)) {
            return ColumnType.DOUBLE;
        } else {
            return ColumnType.STRING;
        }
    }

    public ColumnType resolveColumnType(ColumnType a, ColumnType b) {
        ColumnType type = ColumnType.closest(a, b);
        return type == null ? ColumnType.STRING : type;
    }

    public String parseHeader(String header){
        if (header.startsWith("\"") && header.endsWith("\"")) {
            header = header.substring(1, header.length() - 1);
        }

        return header;
    }

    public double parseBoolean(String value) {
        if (isValueMissing(value) || isNa(value)) {
            return Double.NaN;
        }

        if (value.equalsIgnoreCase("false")) {
            return 0;
        } else if (value.equalsIgnoreCase("true")) {
            return 1;
        } else {
            throw new IllegalArgumentException("Failed to parse boolean");
        }
    }

    public OverrideValue parseOverrideBoolean(String value) {
        if (isValueMissing(value)) {
            return OverrideValue.MISSING;
        }

        if (isNa(value)) {
            return OverrideValue.NA;
        }

        if (value.equalsIgnoreCase("false")) {
            return new OverrideValue(value, 0);
        } else if (value.equalsIgnoreCase("true")) {
            return new OverrideValue(value, 1);
        } else {
            throw new IllegalArgumentException("Failed to parse boolean");
        }
    }

    public double parseLong(String value) {
        if (isValueMissing(value) || isNa(value)) {
            return Double.NaN;
        }

        return Long.parseLong(value);
    }

    public OverrideValue parseOverrideLong(String value) {
        if (isValueMissing(value)) {
            return OverrideValue.MISSING;
        }

        if (isNa(value)) {
            return OverrideValue.NA;
        }

        return new OverrideValue(value, (double) Long.parseLong(value));
    }

    public double parseDouble(String value) {
        if (isValueMissing(value) || isNa(value)) {
            return Double.NaN;
        }

        return Double.parseDouble(value);
    }

    public OverrideValue parseOverrideDouble(String value) {
        if (isValueMissing(value)) {
            return OverrideValue.MISSING;
        }

        if (isNa(value)) {
            return OverrideValue.NA;
        }

        return new OverrideValue(value, Double.parseDouble(value));
    }

    public OverrideValue parseOverrideDate(String value) {
        if (isValueMissing(value)) {
            return OverrideValue.MISSING;
        }

        if (isNa(value)) {
            return OverrideValue.NA;
        }

        return new OverrideValue(value, ExcelDateTime.from(value));
    }

    public OverrideValue parseOverrideString(String value) {
        if (isValueMissing(value)) {
            return OverrideValue.MISSING;
        }

        if (isNa(value)) {
            return OverrideValue.NA;
        }

        if (value.startsWith("\"") && value.endsWith("\"")) {
            value = value.substring(1, value.length() - 1);
        }

        return new OverrideValue(value);
    }

    private boolean isValueMissing(String value) {
        return value == null || value.isEmpty();
    }

    private boolean isNa(String value) {
        return value.equalsIgnoreCase("na") || value.equalsIgnoreCase("null");
    }

    private boolean isBoolean(String item) {
        return item.equalsIgnoreCase("false") || item.equalsIgnoreCase("true");
    }
}
