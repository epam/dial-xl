package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Arrays;
import java.util.List;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableComparator;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;

public class MinBy implements AggregateFunction {
    @Override
    public long[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        long[] refs = new long[size];
        double[] mins = new double[size];
        Arrays.fill(refs, Util.NA_REF);

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);
            long ref = refs[row];

            if (ref == Util.NA_REF || TableComparator.compare(mins[row], value, true) > 0) {
                refs[row] = i;
                mins[row] = value;
            }
        }

        return refs;
    }
}