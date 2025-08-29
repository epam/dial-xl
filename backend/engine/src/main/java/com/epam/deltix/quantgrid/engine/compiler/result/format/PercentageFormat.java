package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;

public record PercentageFormat(String format, boolean useThousandsSeparator) implements ColumnFormat {
    @Override
    public ColumnFormat merge(ColumnFormat other) {
        if (other instanceof PercentageFormat percentageFormat) {
            String resolveFormat = NumberFormat.resolveFormat(format, percentageFormat.format);
            return new PercentageFormat(
                    resolveFormat, useThousandsSeparator || percentageFormat.useThousandsSeparator);
        }

        return ColumnFormat.super.merge(other);
    }

    @Override
    public Formatter createFormatter() {
        return value -> NumberFormat.createFormatter(format, useThousandsSeparator, "", "%")
                .apply(value * 100);
    }

    @Override
    public String toString() {
        return "Percentage,[" + format + "," + useThousandsSeparator + "]";
    }
}
