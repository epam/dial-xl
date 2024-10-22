package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.util.Doubles;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.Arrays;
import java.util.List;

public class NestedAggregateLocal extends Plan2<Table, Table, Table> {

    private final AggregateFunction function;

    public NestedAggregateLocal(AggregateFunction function,
                                Plan layout, Plan source,
                                Expression key, Expression... arguments) {
        this(function, layout, source, key, List.of(arguments));
    }

    public NestedAggregateLocal(AggregateFunction function,
                                Plan layout, Plan source,
                                Expression key, List<Expression> arguments) {
        super(sourceOf(layout), sourceOf(source, Util.listOf(key, arguments)));
        this.function = function;
        Util.verify(arguments.size() == function.argumentCount());
    }

    @Override
    protected Plan layout() {
        return function.resultNested() ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(function.schema(this, 1, 1));
    }

    @Override
    protected Table execute(Table layout, Table table) {
        int size = Util.toIntSize(layout);
        DoubleColumn keys = expression(1, 0).evaluate();
        List<Expression> args = expressions(1, 1);

        return switch (function) {
            case COUNT -> aggregate(SimpleAggregateLocal::count, 0, table, keys, args, size);
            case COUNT_ALL -> aggregate(SimpleAggregateLocal::countAll, 0, table, keys, args, size);
            case SUM -> aggregate(SimpleAggregateLocal::sum, 0, table, keys, args, size);
            case AVERAGE -> aggregate(SimpleAggregateLocal::average, Doubles.ERROR_NA, table, keys, args, size);
            case MIN -> aggregate(SimpleAggregateLocal::min, Doubles.ERROR_NA, table, keys, args, size);
            case MAX -> aggregate(SimpleAggregateLocal::max, Doubles.ERROR_NA, table, keys, args, size);
            case STDEVS -> aggregate(SimpleAggregateLocal::stdevs, Doubles.ERROR_NA, table, keys, args, size);
            case STDEVP -> aggregate(SimpleAggregateLocal::stdevp, Doubles.ERROR_NA, table, keys, args, size);
            case GEOMEAN -> aggregate(SimpleAggregateLocal::geomean, Doubles.ERROR_NA, table, keys, args, size);
            case MEDIAN -> aggregate(SimpleAggregateLocal::median, Doubles.ERROR_NA, table, keys, args, size);
            case MODE -> mode(table, keys, args, size);
            case CORRELATION -> correlation(table, keys, args, size);
            case FIRST -> aggregate(SimpleAggregateLocal::first, Util.NA_REF, table, keys, size);
            case SINGLE -> aggregate(SimpleAggregateLocal::single, Util.NA_REF, table, keys, size);
            case LAST -> aggregate(SimpleAggregateLocal::last, Util.NA_REF, table, keys, size);
            case INDEX -> aggregate(SimpleAggregateLocal::index, Util.NA_REF, table, keys, args, size);
            case MINBY -> aggregate(SimpleAggregateLocal::minBy, Util.NA_REF, table, keys, args, size);
            case MAXBY -> aggregate(SimpleAggregateLocal::maxBy, Util.NA_REF, table, keys, args, size);
            case FIRSTS -> firsts(table, keys, args, size);
            case LASTS -> lasts(table, keys, args, size);
            case PERIOD_SERIES -> periodSeries(table, keys, args, size);
        };
    }

    private static <A extends Column> Table aggregate(SimpleAggregateLocal.UnaryDoubleAggregation<A> function,
                                                      double missing,
                                                      Table table, DoubleColumn keys, List<Expression> arguments,
                                                      int resultSize) {
        A values = arguments.get(0).evaluate();
        long size = table.size();
        double[] results = new double[resultSize];
        Arrays.fill(results, missing);
        long from = 0;
        int prev = 0;

        for (long to = 0; to <= size; to++) {
            int next = (to == size) ? resultSize : (int) keys.get(to);
            Util.verify(next >= prev);

            if (next > prev) {
                results[prev] = function.aggregate(values, from, to);
                prev = next;
                from = to;
            }
        }

        return new LocalTable(new DoubleDirectColumn(results));
    }

    private static Table aggregate(SimpleAggregateLocal.NullaryReferenceAggregation function,
                                   long missing,
                                   Table table, DoubleColumn keys, int resultSize) {
        long size = table.size();
        long[] results = new long[resultSize];
        Arrays.fill(results, missing);
        long from = 0;
        int prev = 0;

        for (long to = 0; to <= size; to++) {
            int next = (to == size) ? resultSize : (int) keys.get(to);
            Util.verify(next >= prev);

            if (next > prev) {
                results[prev] = function.aggregate(from, to);
                prev = next;
                from = to;
            }
        }

        return LocalTable.indirectOf(table, results);
    }

    private static <A extends Column> Table aggregate(SimpleAggregateLocal.UnaryReferenceAggregation<A> function,
                                                      long missing,
                                                      Table table, DoubleColumn keys, List<Expression> arguments,
                                                      int resultSize) {
        A values = arguments.get(0).evaluate();
        long size = table.size();
        long[] results = new long[resultSize];
        Arrays.fill(results, missing);
        long from = 0;
        int prev = 0;

        for (long to = 0; to <= size; to++) {
            int next = (to == size) ? resultSize : (int) keys.get(to);
            Util.verify(next >= prev);

            if (next > prev) {
                results[prev] = function.aggregate(values, from, to);
                prev = next;
                from = to;
            }
        }

        return LocalTable.indirectOf(table, results);
    }

    private static Table mode(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        Column values = arguments.get(0).evaluate();

        if (values instanceof DoubleColumn) {
            return NestedAggregateLocal.<DoubleColumn>aggregate(SimpleAggregateLocal::mode,
                    Doubles.ERROR_NA, table, keys, arguments, resultSize);
        }

        if (values instanceof StringColumn strings) {
            return mode(table, keys, strings, resultSize);
        }

        throw new IllegalArgumentException();
    }

    private static LocalTable mode(Table table, DoubleColumn keys, StringColumn values, int resultSize) {
        long size = table.size();
        String[] modes = new String[resultSize];
        long from = 0;
        int prev = 0;

        for (long i = 0; i <= size; i++) {
            int next = (i == size) ? resultSize : (int) keys.get(i);

            if (next > prev) {
                modes[prev] = SimpleAggregateLocal.mode(values, from, i);
                prev = next;
                from = i;
            }
        }

        return new LocalTable(new StringDirectColumn(modes));
    }

    private static Table correlation(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn xs = arguments.get(0).evaluate();
        DoubleColumn ys = arguments.get(1).evaluate();

        long size = table.size();
        double[] correlations = new double[resultSize];
        Arrays.fill(correlations, Doubles.ERROR_NA);
        long from = 0;
        int prev = 0;

        for (long i = 0; i <= size; i++) {
            int next = (i == size) ? resultSize : (int) keys.get(i);

            if (next > prev) {
                correlations[prev] = SimpleAggregateLocal.correlation(xs, ys, from, i);
                prev = next;
                from = i;
            }
        }

        Doubles.normalizeNaNs(correlations);
        return new LocalTable(new DoubleDirectColumn(correlations));
    }

    private static Table firsts(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn limits = arguments.get(0).evaluate();
        LongArrayList refs = new LongArrayList(resultSize);
        long tableSize = table.size();

        for (long ref = 0, prev = -1, count = 0, limit = 0; ref < tableSize; ref++) {
            int next = (int) keys.get(ref);
            long lim = (long) limits.get(ref);

            if (next <= prev) {
                Util.verify(next == prev, "Keys is decreasing");
                Util.verify(lim == limit, "Limits does not match");
            } else {
                prev = next;
                count = 0;
                limit = lim;
            }

            if (count++ < limit) {
                refs.add(ref);
            }
        }

        return LocalTable.indirectOf(table, refs);
    }

    private static Table lasts(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn limits = arguments.get(0).evaluate();
        LongArrayList refs = new LongArrayList(resultSize);
        long tableSize = table.size();

        for (long ref = tableSize - 1, prev = resultSize, count = 0, limit = 0; ref >= 0; ref--) {
            int next = (int) keys.get(ref);
            long lim = (long) limits.get(ref);

            if (next >= prev) {
                Util.verify(next == prev, "Keys is decreasing");
                Util.verify(lim == limit, "Limits does not match");
            } else {
                prev = next;
                count = 0;
                limit = lim;
            }

            if (count++ < limit) {
                refs.add(ref);
            }
        }

        for (int i = 0, j = refs.size() - 1; i < j; i++, j--) {
            long a = refs.getLong(i);
            long b = refs.getLong(j);
            refs.set(i, b);
            refs.set(j, a);
        }

        return LocalTable.indirectOf(table, refs);
    }

    private static Table periodSeries(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        PeriodSeries[] series = new PeriodSeries[resultSize];
        DoubleColumn timestamps = arguments.get(0).evaluate();
        DoubleColumn values = arguments.get(1).evaluate();
        StringColumn periods = arguments.get(2).evaluate();

        int prev = 0;
        long from = 0;
        long size = table.size();

        for (long i = 0; i <= size; i++) {
            int key = (i == size) ? series.length : Util.toIntIndex(keys.get(i));
            Util.verify(prev <= key, "Key column has invalid values");

            if (prev != key) {
                series[prev] = SimpleAggregateLocal.periodSeries(timestamps, values, periods, from, i);
                prev = key;
                from = i;
            }
        }

        return new LocalTable(new PeriodSeriesDirectColumn(series));
    }
}
