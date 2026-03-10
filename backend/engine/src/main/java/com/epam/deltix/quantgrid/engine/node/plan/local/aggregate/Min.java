package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Arrays;
import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;

public class Min implements AggregateFunction {
    @Override
    public Object aggregate(DoubleColumn rows, List<Column> args, int size) {
        if (args.get(0) instanceof DoubleColumn values) {
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

        if (args.get(0) instanceof StringColumn values) {
            String[] mins = new String[size];
            Arrays.fill(mins, Strings.EMPTY);

            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                String value = values.get(i);
                String min = mins[row];

                if (Strings.isEmpty(value) || Strings.isError(min)) {
                    continue;
                }

                if (Strings.isError(value)) {
                    mins[row] = value;
                    continue;
                }

                mins[row] = (Strings.isEmpty(min) || value.compareTo(min) < 0) ? value : min;
            }

            for (int i = 0; i < size; i++) {
                if (Strings.isEmpty(mins[i])) {
                    mins[i] = Strings.ERROR_NA;
                }
            }

            return mins;
        }

        throw new IllegalArgumentException("Not supported: " + args.get(0).getClass());
    }
}