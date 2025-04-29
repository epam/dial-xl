package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Arrays;
import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.util.Doubles;

public class Max implements AggregateFunction {
    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        double[] maxs = new double[size];
        Arrays.fill(maxs, Doubles.EMPTY);

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);
            double max = maxs[row];

            if (Doubles.isEmpty(value) || Doubles.isError(max)) {
                continue;
            }

            if (Doubles.isError(value)) {
                maxs[row] = value;
                continue;
            }

            maxs[row] = Doubles.isEmpty(max) ? value : Double.max(max, value);
        }

        for (int i = 0; i < size; i++) {
            if (Doubles.isEmpty(maxs[i])) {
                maxs[i] = Doubles.ERROR_NA;
            }
        }

        return maxs;
    }
}