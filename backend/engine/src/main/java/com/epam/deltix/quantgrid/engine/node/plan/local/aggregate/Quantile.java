package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.commons.math3.stat.descriptive.rank.Percentile;

import java.util.List;

import static com.epam.deltix.quantgrid.util.Doubles.ERROR_NA;
import static com.epam.deltix.quantgrid.util.Doubles.isEmpty;
import static com.epam.deltix.quantgrid.util.Doubles.isError;
import static com.epam.deltix.quantgrid.util.Doubles.normalizeNaN;

@RequiredArgsConstructor
public class Quantile implements AggregateFunction {
    private final Type type;

    @Override
    public double[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn values = (DoubleColumn) args.get(0);
        DoubleColumn quantiles = (DoubleColumn) args.get(1);
        Stats[] stats = new Stats[size];
        double[] results = new double[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double value = values.get(i);
            double quantile = quantiles.get(i);

            if (isEmpty(value) || isError(results[row])) {
                continue;
            }

            if (isError(value)) {
                results[row] = value;
                continue;
            }

            if (isError(quantile) || isEmpty(quantile)) {
                results[row] = ERROR_NA;
                continue;
            }

            if (stats[row] == null) {
                stats[row] = new Stats(quantiles.get(i));
            }

            Util.verify(quantile == stats[row].q,"Quantile must be constant for each row");
            stats[row].add(value);
        }

        Percentile percentile = new Percentile()
                .withEstimationType(type.estimationType);
        for (int i = 0; i < size; i++) {
            if (!isError(results[i])) {
                results[i] = stats[i] == null
                        ? ERROR_NA
                        : normalizeNaN(stats[i].evaluate(percentile, type.exclusive, type.quartile));
            }
        }

        return results;
    }

    @RequiredArgsConstructor
    private static class Stats {
        private final DoubleArrayList array = new DoubleArrayList();
        private double min = Double.POSITIVE_INFINITY;
        private final double q;

        public void add(double number) {
            min = Math.min(min, number);
            array.add(number);
        }

        public double evaluate(Percentile percentile, boolean exclusive, boolean quartile) {
            double p = quartile ? Math.floor(q) / 4 : q;
            double from = exclusive ? 1d / (array.size() + 1) : 0;
            if (p < from || p > 1 - from) {
                return ERROR_NA;
            }

            if (p == 0) {
                // 0th percentile is not supported by Percentile, return min
                return min;
            }

            return percentile.evaluate(array.elements(), 0, array.size(), p * 100);
        }
    }

    @Getter
    @RequiredArgsConstructor
    public enum Type {
        PERCENTILE_INC(Percentile.EstimationType.R_7, false, false),
        PERCENTILE_EXC(Percentile.EstimationType.R_6, true, false),
        QUARTILE_INC(Percentile.EstimationType.R_7, false, true),
        QUARTILE_EXC(Percentile.EstimationType.R_6, true, true);

        private final Percentile.EstimationType estimationType;
        private final boolean exclusive;
        private final boolean quartile;
    }
}