package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;

public class Count implements AggregateFunction {
    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        Column column = args.get(0);
        double[] counts = new double[size];

        if (column instanceof DoubleColumn values) {
            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                double value = values.get(i);

                if (!Doubles.isEmpty(value)) {
                    counts[row]++;
                }
            }

            return counts;
        }

        if (column instanceof StringColumn values) {
            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                String value = values.get(i);

                if (!Strings.isEmpty(value)) {
                    counts[row]++;
                }
            }

            return counts;
        }

        if (column instanceof PeriodSeriesColumn) {
            for (long i = 0; i < rows.size(); i++) {
                int row = (int) rows.get(i);
                counts[row]++; // no empty value for period series
            }

            return counts;
        }

        throw new IllegalArgumentException("Not expected column: " + column.getClass());
    }
}