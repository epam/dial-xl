package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Arrays;
import java.util.List;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;

public class Single implements AggregateFunction {
    @Override
    public long[] aggregate(long rows, List<Column> args) {
        long ref = (rows == 1) ? 0 : Util.NA_REF;
        return new long[] {ref};
    }

    @Override
    public long[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        long[] refs = new long[size];
        Arrays.fill(refs, Util.NA_REF);

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            refs[row] = (refs[row] == Util.NA_REF) ? i : Util.NA_ERROR;
        }

        return refs;
    }
}