package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import lombok.RequiredArgsConstructor;
import org.apache.commons.math3.stat.descriptive.moment.StandardDeviation;

@RequiredArgsConstructor
public class Stdev implements AggregateFunction {
    private final boolean biasedCorrected;

    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        StandardDeviation[] stats = new StandardDeviation[size];
        double[] results = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);

            if (Doubles.isEmpty(value) || Doubles.isError(results[row])) {
                continue;
            }

            if (Doubles.isError(value)) {
                results[row] = value;
                continue;
            }

            if (stats[row] == null) {
                stats[row] = new StandardDeviation(biasedCorrected);
            }

            stats[row].increment(value);
        }

        for (int i = 0; i < size; i++) {
            if (!Doubles.isError(results[i])) {
                results[i] = (stats[i] == null) ? Doubles.ERROR_NA : Doubles.normalizeNaN(stats[i].getResult());
            }
        }

        return results;
    }
}