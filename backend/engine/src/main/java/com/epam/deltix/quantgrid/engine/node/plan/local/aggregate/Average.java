package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.util.Doubles;

public class Average implements AggregateFunction {
    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        double[] sums = new double[size];
        double[] count = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);

            if (Doubles.isEmpty(value) || Doubles.isError(sums[row])) {
                continue;
            }

            if (Doubles.isError(value)) {
                sums[row] = value;
                continue;
            }

            sums[row] += value;
            count[row]++;
        }

        for (int i = 0; i < size; i++) {
            if (!Doubles.isError(sums[i])) {
                sums[i] = Doubles.normalizeNaN(sums[i] / count[i]);
            }
        }

        return sums;
    }
}