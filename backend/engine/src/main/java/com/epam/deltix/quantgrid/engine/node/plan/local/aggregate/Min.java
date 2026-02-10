package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Arrays;
import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.util.Doubles;

public class Min implements AggregateFunction {
    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        double[] mins = new double[size];
        Arrays.fill(mins, Doubles.EMPTY);

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);
            double min = mins[row];

            if (Doubles.isEmpty(value) || Doubles.isError(min)) {
                continue;
            }

            if (Doubles.isError(value)) {
                mins[row] = value;
                continue;
            }

            mins[row] = Doubles.isEmpty(min) ? value : Double.min(min, value);
        }

        for (int i = 0; i < size; i++) {
            if (Doubles.isEmpty(mins[i])) {
                mins[i] = Doubles.ERROR_NA;
            }
        }

        return mins;
    }
}