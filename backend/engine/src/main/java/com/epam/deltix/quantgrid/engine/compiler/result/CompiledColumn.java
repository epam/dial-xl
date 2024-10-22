package com.epam.deltix.quantgrid.engine.compiler.result;

import com.epam.deltix.quantgrid.type.ColumnType;

public interface CompiledColumn extends CompiledResult {
    ColumnType type();
}
