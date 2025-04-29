package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.util.Doubles;

import java.util.Arrays;
import java.util.List;

public class Index implements AggregateFunction {
    @Override
    public long[] aggregate(long rows, List<Column> args) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        long ref = Util.NA_REF;
        double index = Doubles.ERROR_NA;

        for (long i = 0; i < rows; i++) {
            double value = values.get(i);

            if (ref == Util.NA_REF) {
                ref = (long) value;
                index = value;
            }

            if (Doubles.isError(value) || Doubles.isEmpty(value) || value < 0 || value >= rows || index != value) {
                ref = Util.NA_REF;
                break;
            }
        }

        return new long[]{ref};
    }

    @Override
    public long[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn indices = (DoubleColumn) args.get(0);
        long[] refs = new long[size];
        long[] counts = new long[size];
        double[] values = new double[size];
        Arrays.fill(refs, Util.NA_REF);

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double index = indices.get(i);
            long ref = refs[row];

            if (ref == Util.NA_ERROR) {
                continue;
            }

            if (ref == Util.NA_REF) {
                values[row] = index;
            }

            if (Doubles.isEmpty(index) || Doubles.isError(index) || index < 0 || index != values[row]) {
                refs[row] = Util.NA_ERROR;
                continue;
            }

            if (counts[row]++ == index) {
                refs[row] = i;
            }
        }

        return refs;
    }
}