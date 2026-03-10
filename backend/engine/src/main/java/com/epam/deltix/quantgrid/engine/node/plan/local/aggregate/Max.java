package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.Arrays;
import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;

public class Max implements AggregateFunction {
    @Override
    public Object aggregate(DoubleColumn rows, List<Column> args, int size) {
        if (args.get(0) instanceof DoubleColumn values) {
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

        if (args.get(0) instanceof StringColumn values) {
            String[] maxs = new String[size];
            Arrays.fill(maxs, Strings.EMPTY);

            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                String value = values.get(i);
                String max = maxs[row];

                if (Strings.isEmpty(value) || Strings.isError(max)) {
                    continue;
                }

                if (Strings.isError(value)) {
                    maxs[row] = value;
                    continue;
                }

                maxs[row] = (Strings.isEmpty(max) || value.compareTo(max) > 0) ? value : max;
            }

            for (int i = 0; i < size; i++) {
                if (Strings.isEmpty(maxs[i])) {
                    maxs[i] = Strings.ERROR_NA;
                }
            }

            return maxs;
        }

        throw new IllegalArgumentException("Not supported: " + args.get(0).getClass());
    }
}