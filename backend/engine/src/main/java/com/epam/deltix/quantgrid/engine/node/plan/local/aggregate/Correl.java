package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;

import static com.epam.deltix.quantgrid.util.Doubles.isEmpty;
import static com.epam.deltix.quantgrid.util.Doubles.isError;
import static com.epam.deltix.quantgrid.util.Doubles.normalizeNaN;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;

public class Correl implements AggregateFunction {
    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn xs = (DoubleColumn) args.get(0);
        DoubleColumn ys = (DoubleColumn) args.get(1);

        double[] counts = new double[size];
        double[] sumsX = new double[size];
        double[] sumsY = new double[size];
        double[] sumsXX = new double[size];
        double[] sumsYY = new double[size];
        double[] sumsXY = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double x = xs.get(i);
            double y = ys.get(i);

            if (isError(counts[row])) {
                continue;
            }

            if (isError(x)) {
                counts[row] = x;
                continue;
            }

            if (isError(y)) {
                counts[row] = y;
                continue;
            }

            if (isEmpty(x) || isEmpty(y)) {
                continue;
            }

            counts[row]++;
            sumsX[row] += x;
            sumsY[row] += y;
            sumsXX[row] += x * x;
            sumsYY[row] += y * y;
            sumsXY[row] += x * y;
        }

        for (int i = 0; i < size; i++) {
            if (!isError(counts[i])) {
                double covariant = sumsXY[i] / counts[i] - sumsX[i] * sumsY[i] / counts[i] / counts[i];
                double sigmaX = Math.sqrt(sumsXX[i] / counts[i] - sumsX[i] * sumsX[i] / counts[i] / counts[i]);
                double sigmaY = Math.sqrt(sumsYY[i] / counts[i] - sumsY[i] * sumsY[i] / counts[i] / counts[i]);
                counts[i] = normalizeNaN(covariant / sigmaX / sigmaY);
            }
        }

        return counts;
    }
}