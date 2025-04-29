package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import static com.epam.deltix.quantgrid.util.Doubles.ERROR_NA;
import static com.epam.deltix.quantgrid.util.Doubles.isEmpty;
import static com.epam.deltix.quantgrid.util.Doubles.isError;
import static com.epam.deltix.quantgrid.util.Doubles.normalizeNaN;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;

public class Median implements AggregateFunction {
    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        DescriptiveStatistics[] stats = new DescriptiveStatistics[size];
        double[] results = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);

            if (isEmpty(value) || isError(results[row])) {
                continue;
            }

            if (isError(value)) {
                results[row] = value;
                continue;
            }

            if (stats[row] == null) {
                stats[row] = new DescriptiveStatistics();
            }

            stats[row].addValue(value);
        }

        for (int i = 0; i < size; i++) {
            if (!isError(results[i])) {
                results[i] = (stats[i] == null) ? ERROR_NA : normalizeNaN(stats[i].getPercentile(50));
            }
        }

        return results;
    }
}