package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableComparator;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.doubles.Double2IntOpenHashMap;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import org.apache.commons.math3.stat.descriptive.DescriptiveStatistics;
import org.apache.commons.math3.stat.descriptive.moment.GeometricMean;
import org.apache.commons.math3.stat.descriptive.moment.StandardDeviation;
import org.jetbrains.annotations.Nullable;

import java.util.List;

public class SimpleAggregateLocal extends Plan2<Table, Table, Table> {

    private final AggregateFunction function;

    public SimpleAggregateLocal(AggregateFunction function, Plan layout, Plan source, Expression... arguments) {
        this(function, layout, source, List.of(arguments));
    }

    public SimpleAggregateLocal(AggregateFunction function, Plan layout, Plan source, List<Expression> arguments) {
        super(sourceOf(layout), sourceOf(source, arguments));
        this.function = function;
        Util.verify(arguments.size() == function.argumentCount());
    }

    @Override
    protected Plan layout() {
        return function.resultNested() ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(function.schema(this, 1, 0));
    }

    @Override
    protected Table execute(Table layout, Table table) {
        Util.verify(layout.size() == 1);
        List<Expression> arguments = expressions(1);

        return switch (function) {
            case COUNT -> aggregate(SimpleAggregateLocal::count, table, arguments);
            case COUNT_ALL -> aggregate(SimpleAggregateLocal::countAll, table, arguments);
            case SUM -> aggregate(SimpleAggregateLocal::sum, table, arguments);
            case AVERAGE -> aggregate(SimpleAggregateLocal::average, table, arguments);
            case MIN -> aggregate(SimpleAggregateLocal::min, table, arguments);
            case MAX -> aggregate(SimpleAggregateLocal::max, table, arguments);
            case STDEVS -> aggregate(SimpleAggregateLocal::stdevs, table, arguments);
            case STDEVP -> aggregate(SimpleAggregateLocal::stdevp, table, arguments);
            case GEOMEAN -> aggregate(SimpleAggregateLocal::geomean, table, arguments);
            case MEDIAN -> aggregate(SimpleAggregateLocal::median, table, arguments);
            case MODE -> mode(table, arguments);
            case CORRELATION -> correlation(table, arguments);
            case FIRST -> aggregate(SimpleAggregateLocal::first, table);
            case SINGLE -> aggregate(SimpleAggregateLocal::single, table);
            case LAST -> aggregate(SimpleAggregateLocal::last, table);
            case INDEX -> aggregate(SimpleAggregateLocal::index, table, arguments);
            case MINBY -> aggregate(SimpleAggregateLocal::minBy, table, arguments);
            case MAXBY -> aggregate(SimpleAggregateLocal::maxBy, table, arguments);
            case FIRSTS -> firsts(table, arguments);
            case LASTS -> lasts(table, arguments);
            case PERIOD_SERIES -> periodSeries(table, arguments);
        };
    }

    private static Table mode(Table table, List<Expression> arguments) {
        Column values = arguments.get(0).evaluate();
        long size = table.size();

        if (values instanceof DoubleColumn doubleColumn) {
            return new LocalTable(new DoubleDirectColumn(mode(doubleColumn, 0, size)));
        }

        if (values instanceof StringColumn stringColumn) {
            return new LocalTable(new StringDirectColumn(mode(stringColumn, 0, size)));
        }

        throw new IllegalArgumentException("Unsupported column: " + values.getClass());
    }

    private static Table correlation(Table table, List<Expression> arguments) {
        DoubleColumn xs = arguments.get(0).evaluate();
        DoubleColumn ys = arguments.get(1).evaluate();

        long size = table.size();
        double correlation = correlation(xs, ys, 0, size);

        return new LocalTable(new DoubleDirectColumn(correlation));
    }

    private static <A extends Column> Table aggregate(UnaryDoubleAggregation<A> function,
                                                      Table table, List<Expression> arguments) {
        A values = arguments.get(0).evaluate();
        double result = function.aggregate(values, 0, table.size());
        return new LocalTable(new DoubleDirectColumn(result));
    }

    private static Table aggregate(NullaryReferenceAggregation function, Table table) {
        long result = function.aggregate(0, table.size());
        return LocalTable.indirectOf(table, new long[] {result});
    }

    private static <A extends Column> Table aggregate(UnaryReferenceAggregation<A> function,
                                                      Table table, List<Expression> arguments) {
        A values = arguments.get(0).evaluate();
        long result = function.aggregate(values, 0, table.size());
        return LocalTable.indirectOf(table, new long[] {result});
    }

    static double countAll(Column column, long from, long to) {
        return to - from;
    }

    static double count(Column column, long from, long to) {
        if (column instanceof DoubleColumn values) {
            long count = 0;

            for (; from < to; from++) {
                double value = values.get(from);

                if (Doubles.isEmpty(value)) {
                    continue;
                }

                if (Doubles.isError(value)) {
                    return value;
                }

                count++;
            }

            return count;
        }

        if (column instanceof StringColumn values) {
            long count = 0;

            for (; from < to; from++) {
                String value = values.get(from);

                if (Strings.isEmpty(value)) {
                    continue;
                }

                if (Strings.isError(value)) {
                    return Strings.toDoubleError(value);
                }

                count++;
            }

            return count;
        }

        if (column instanceof PeriodSeriesColumn values) {
            long count = 0;

            for (; from < to; from++) {
                PeriodSeries value = values.get(from);

                if (value == null) {
                    return Doubles.ERROR_NA;
                }

                count++;
            }

            return count;
        }

        throw new IllegalArgumentException("Not expected: " + column.getClass());
    }

    static double sum(DoubleColumn values, long from, long to) {
        double sum = 0;

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            sum += value;
        }

        return sum;
    }

    static double average(DoubleColumn values, long from, long to) {
        double sum = 0;
        double count = 0;

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            sum += value;
            count++;
        }

        return Doubles.normalizeNaN(sum / count);
    }

    static double min(DoubleColumn values, long from, long to) {
        double min = Double.POSITIVE_INFINITY;
        boolean found = false;

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            min = Double.min(min, value);
            found = true;
        }

        return found ? min : Doubles.ERROR_NA;
    }

    static double max(DoubleColumn values, long from, long to) {
        double max = Double.NEGATIVE_INFINITY;
        boolean found = false;

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            max = Double.max(max, value);
            found = true;
        }

        return found ? max : Doubles.ERROR_NA;
    }

    static double stdevs(DoubleColumn values, long from, long to) {
        return stdev(values, from, to, true);
    }

    static double stdevp(DoubleColumn values, long from, long to) {
        return stdev(values, from, to, false);
    }

    static double stdev(DoubleColumn values, long from, long to, boolean biasCorrected) {
        StandardDeviation stdev = new StandardDeviation(biasCorrected);

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            stdev.increment(value);
        }

        return Doubles.normalizeNaN(stdev.getResult());
    }

    static double median(DoubleColumn values, long from, long to) {
        DescriptiveStatistics stats = new DescriptiveStatistics();

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            stats.addValue(value);
        }

        return Doubles.normalizeNaN(stats.getPercentile(50));
    }

    static double geomean(DoubleColumn values, long from, long to) {
        GeometricMean stats = new GeometricMean();

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            stats.increment(value);
        }

        return Doubles.normalizeNaN(stats.getResult());
    }

    @Nullable
    static String mode(StringColumn values, long from, long to) {
        Object2IntOpenHashMap<String> map = new Object2IntOpenHashMap<>();
        long totalCount = 0;
        String mode = null;
        int modeCount = -1;

        for (; from < to; from++) {
            String value = values.get(from);

            if (Strings.isEmpty(value)) {
                continue;
            }

            if (Strings.isError(value)) {
                return value;
            }

            int valueCount = map.addTo(value, 1);
            totalCount++;

            if (valueCount > modeCount) {
                mode = value;
                modeCount = valueCount;
            }
        }

        return (map.size() == totalCount) ? null : mode;
    }

    static double mode(DoubleColumn column, long from, long to) {
        Double2IntOpenHashMap map = new Double2IntOpenHashMap();
        long totalCount = 0;
        double mode = Doubles.ERROR_NA;
        int modeCount = -1;

        for (; from < to; from++) {
            double value = column.get(from);

            if (Doubles.isEmpty(value)) {
                continue;
            }

            if (Doubles.isError(value)) {
                return value;
            }

            int valueCount = map.addTo(value, 1);
            totalCount++;

            if (valueCount > modeCount) {
                mode = value;
                modeCount = valueCount;
            }
        }

        return (map.size() == totalCount) ? Doubles.ERROR_NA : mode;
    }

    static double correlation(DoubleColumn xs, DoubleColumn ys, long from, long to) {
        long n = 0;
        double sumX = 0.0;
        double sumY = 0.0;
        double sumXX = 0.0;
        double sumYY = 0.0;
        double sumXY = 0.0;

        for (long i = from; i < to; i++) {
            double x = xs.get(i);
            double y = ys.get(i);

            if (Doubles.isError(x)) {
                return x;
            }

            if (Doubles.isError(y)) {
                return y;
            }

            if (Doubles.isEmpty(x) || Doubles.isEmpty(y)) {
                continue;
            }

            n++;
            sumX += x;
            sumY += y;
            sumXX += x * x;
            sumYY += y * y;
            sumXY += x * y;
        }

        double covariant = sumXY / n - sumX * sumY / n / n;
        double sigmaX = Math.sqrt(sumXX / n - sumX * sumX / n / n);
        double sigmaY = Math.sqrt(sumYY / n - sumY * sumY / n / n);

        double result = covariant / sigmaX / sigmaY;
        return Doubles.normalizeNaN(result);
    }

    static long first(long from, long to) {
        return (from < to) ? from : Util.NA_REF;
    }

    static long single(long from, long to) {
        return (from + 1 == to) ? from : Util.NA_REF;
    }

    static long last(long from, long to) {
        return (from < to) ? (to - 1) : Util.NA_REF;
    }

    static long index(DoubleColumn values, long from, long to) {
        long ref = Util.NA_REF;
        long size = to - from;
        double index = Doubles.ERROR_NA;

        for (; from < to; from++) {
            double value = values.get(from);

            if (Doubles.isError(value) || Doubles.isEmpty(value)) {
                return Util.NA_REF;
            }

            if (value < 0 || value >= size) { // compiled with minus one
                return Util.NA_REF;
            }

            if (ref == Util.NA_REF) {
                ref = (long) (from + value);
                index = value;
                continue;
            }

            if (index != value) {
                return Util.NA_REF;
            }
        }

        return ref;
    }

    static long minBy(DoubleColumn values, long from, long to) {
        long ref = Util.NA_REF;
        double min = Doubles.ERROR_NA;

        for (; from < to; from++) {
            double value = values.get(from);

            if (ref == Util.NA_REF || TableComparator.compare(min, value, true) > 0) {
                ref = from;
                min = value;
            }
        }

        return ref;
    }

    static long maxBy(DoubleColumn values, long from, long to) {
        long ref = Util.NA_REF;
        double max = Doubles.ERROR_NA;

        for (; from < to; from++) {
            double value = values.get(from);

            if (ref == Util.NA_REF || TableComparator.compare(max, value, false) > 0) {
                ref = from;
                max = value;
            }
        }

        return ref;
    }

    private static Table firsts(Table table, List<Expression> arguments) {
        DoubleColumn limits = arguments.get(0).evaluate();
        long size = table.size();
        long limit = size > 0 ? (long) limits.get(0) : 0;

        for (long i = 0; i < size; i++) {
            long lim = (long) limits.get(i);
            Util.verify(limit == lim, "Limits does not match");
        }

        limit = Math.max(limit, 0);
        return (limit >= size) ? table : LocalTable.lambdaOf(table, key -> key, limit);
    }

    private static Table lasts(Table table, List<Expression> arguments) {
        DoubleColumn limits = arguments.get(0).evaluate();
        long size = table.size();
        long limit = (size > 0) ? (long) limits.get(0) : 0;

        for (long i = 0; i < size; i++) {
            long lim = (long) limits.get(i);
            Util.verify(limit == lim, "Limits does not match");
        }

        limit = Math.max(limit, 0);
        long offset = size - limit;
        return (limit >= size) ? table : LocalTable.lambdaOf(table, key -> key + offset, limit);
    }

    private static Table periodSeries(Table table, List<Expression> arguments) {
        DoubleColumn timestamps = arguments.get(0).evaluate();
        DoubleColumn values = arguments.get(1).evaluate();
        StringColumn periods = arguments.get(2).evaluate();
        PeriodSeries series = periodSeries(timestamps, values, periods, 0, table.size());
        return new LocalTable(new PeriodSeriesDirectColumn(series));
    }

    static PeriodSeries periodSeries(DoubleColumn timestamps, DoubleColumn values, StringColumn periods,
                                     long from, long to) {
        int size = Util.toIntSize(to - from);
        if (size <= 0) {
            return null;
        }

        Period period = Period.valueOf(periods.get(from));
        double timestamp = timestamps.get(from);
        double offset = period.getOffset(timestamp);
        Util.verify(Doubles.isValue(offset), "Timestamp column has invalid value: %s", timestamp);
        double value = values.get(from);

        double start = offset;
        double end = start;

        DoubleArrayList points = new DoubleArrayList(size);
        points.add(value);

        for (long i = from + 1; i < to; i++) {
            timestamp = timestamps.get(i);
            value = values.get(i);
            offset = period.getOffset(timestamp);

            Util.verify(period == Period.valueOf(periods.get(i)), "Period column has invalid period");
            Util.verify(Doubles.isValue(offset), "Timestamp column has invalid value: %s", timestamp);
            Util.verify(offset > end, "Timestamp column is not sorted or has duplicate values");

            while (++end < offset) {
                points.add(Doubles.ERROR_NA);
            }

            points.add(value);
        }

        return new PeriodSeries(period, start, points);
    }

    interface UnaryDoubleAggregation<A extends Column> {
        double aggregate(A column, long from, long to);
    }

    interface NullaryReferenceAggregation {
        long aggregate(long from, long to);
    }

    interface UnaryReferenceAggregation<A extends Column> {
        long aggregate(A column, long from, long to);
    }
}
