package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;

public record CurrencyFormat(String format, boolean useThousandsSeparator, String symbol) implements ColumnFormat {
    @Override
    public ColumnFormat merge(ColumnFormat other) {
        if (other instanceof CurrencyFormat currencyFormat) {
            String resolveFormat = NumberFormat.resolveFormat(format, currencyFormat.format);
            return new CurrencyFormat(
                    resolveFormat, useThousandsSeparator || currencyFormat.useThousandsSeparator, symbol);
        }

        return ColumnFormat.super.merge(other);
    }

    @Override
    public Formatter createFormatter() {
        return NumberFormat.createFormatter(format, useThousandsSeparator, symbol + " ", "");
    }

    @Override
    public String toString() {
        return "Currency,[" + format + "," + useThousandsSeparator + "," + symbol + "]";
    }
}
