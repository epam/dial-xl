package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;

public class PerSeries implements AggregateFunction {
    @Override
    public PeriodSeries[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn timestamps = (DoubleColumn) args.get(0);
        DoubleColumn values = (DoubleColumn) args.get(1);
        StringColumn periods = (StringColumn) args.get(2);
        Bucket[] buckets = new Bucket[size];

        for (long i = 0; i < rows.size(); i++) {
            int row = (int) rows.get(i);
            double timestamp = timestamps.get(i);
            double value = values.get(i);
            String period = periods.get(i);
            Bucket bucket = buckets[row];

            if (bucket == null) {
                bucket = new Bucket();
                buckets[row] = bucket;
            }

            if (bucket.invalid) {
                continue;
            }

            if (Doubles.isError(timestamp) || Strings.isError(period)) {
                bucket.invalid = true;
                continue;
            }

            if (Doubles.isEmpty(value) || Doubles.isEmpty(timestamp) || Strings.isEmpty(period)) {
                continue;
            }

            if (!Period.isValid(period)) {
                bucket.invalid = true;
                continue;
            }

            Period periodValue = Period.valueOf(period);
            if (bucket.period == null) {
                bucket.period = periodValue;
            } else if (bucket.period != periodValue) {
                bucket.invalid = true;
                continue;
            }
            bucket.points.add(new Point(timestamp, value));
        }

        PeriodSeries[] series = new PeriodSeries[size];
        for (int i = 0; i < size; i++) {
            Bucket bucket = buckets[i];
            if (bucket == null || bucket.invalid) {
                series[i] = null;
                continue;
            }

            series[i] = bucket.build();
        }
        return series;
    }

    private static class Bucket {
        final List<Point> points = new ArrayList<>();
        Period period;
        boolean invalid;

        PeriodSeries build() {
            points.sort(Comparator.comparingDouble(Point::timestamp));
            double start = Double.NEGATIVE_INFINITY;
            double previous = Double.NEGATIVE_INFINITY;

            DoubleArrayList values = new DoubleArrayList();
            for (Point point : points) {
                double timestamp = point.timestamp;
                double value = point.value;
                double offset = period.getOffset(timestamp);

                if (!Doubles.isValue(offset)) {
                    return null;
                }

                if (previous == Double.NEGATIVE_INFINITY) {
                    start = offset;
                    previous = offset - 1;
                } else if (offset <= previous) {
                    return null;
                }

                while (++previous < offset) {
                    values.add(Doubles.ERROR_NA);
                }

                values.add(value);
            }

            return start == Double.NEGATIVE_INFINITY
                    ? PeriodSeries.empty(period)
                    : new PeriodSeries(period, start, values);
        }
    }

    private record Point(double timestamp, double value) {
    }
}