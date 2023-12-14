package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import org.jetbrains.annotations.Nullable;

@Getter
@Accessors(fluent = true)
@RequiredArgsConstructor
public enum AggregateFunction {

    COUNT(ColumnType.INTEGER, 0, false, false),
    SUM(ColumnType.DOUBLE, 1, false, false),
    AVERAGE(ColumnType.DOUBLE, 1, false, false),
    MIN(ColumnType.DOUBLE, 1, false, false),
    MAX(ColumnType.DOUBLE, 1, false, false),
    MODE(null, 1, true, false),
    CORRELATION(ColumnType.DOUBLE, 2, false, false),
    FIRST(null, 0, false, false),
    LAST(null, 0, false, false),
    SINGLE(null, 0, false, false),
    FIRSTS(null, 1, false, true),
    LASTS(null, 1, false, true),
    PERIOD_SERIES(ColumnType.PERIOD_SERIES, 3, false, false);

    @Nullable
    private final ColumnType resultType;
    private final int argumentCount; // the number of expressions/columns for function
    private final boolean inferResultType;
    private final boolean resultNested; // true if the result is nested, in this case aggregation node is layout
}
