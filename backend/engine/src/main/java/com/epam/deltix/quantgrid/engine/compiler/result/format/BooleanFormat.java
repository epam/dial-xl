package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;
import lombok.AccessLevel;
import lombok.NoArgsConstructor;

@NoArgsConstructor(access = AccessLevel.PRIVATE)
public class BooleanFormat implements ColumnFormat {
    private static final Formatter FORMATTER = value -> (int) value != 0 ? "TRUE" : "FALSE";
    public static final BooleanFormat INSTANCE = new BooleanFormat();

    @Override
    public Formatter createFormatter() {
        return FORMATTER;
    }

    @Override
    public String toString() {
        return "Boolean";
    }
}
