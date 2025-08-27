package com.epam.deltix.quantgrid.engine.compiler.result.format;

import com.epam.deltix.quantgrid.util.Formatter;

public interface ColumnFormat {
    default ColumnFormat merge(ColumnFormat other) {
        return this.getClass() == other.getClass()
                ? this
                : GeneralFormat.INSTANCE;
    }

    Formatter createFormatter();
}
