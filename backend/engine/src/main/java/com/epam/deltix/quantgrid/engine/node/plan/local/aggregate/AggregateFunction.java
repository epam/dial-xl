package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;

public interface AggregateFunction {

    /**
     * All rows are zero. It is possible to write more optimized version.
     */
    default Object aggregate(long rows, List<Column> args) {
        DoubleLambdaColumn keys = new DoubleLambdaColumn(index -> 0, rows);
        return aggregate(keys, args, 1);
    }

    /**
     * @param rows - contains row numbers starting from 0 to size for the output results. Rows are not sorted.
     * @param size - the size of output.
     * @return an array of long/double/String/PeriodSeries, long for row references.
     */
    Object aggregate(DoubleColumn rows, List<Column> args, int size);
}