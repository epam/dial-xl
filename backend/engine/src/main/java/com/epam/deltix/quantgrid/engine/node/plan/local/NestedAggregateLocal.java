package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
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
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.Arrays;
import java.util.List;

public class NestedAggregateLocal extends Plan2<Table, Table, Table> {

    private final AggregateFunction function;

    public NestedAggregateLocal(AggregateFunction function,
                                Plan layout, Plan source,
                                Expression key, Expression... arguments) {
        super(sourceOf(layout), sourceOf(source, Util.listOf(key, List.of(arguments))));
        this.function = function;
        Util.verify(arguments.length == function.argumentCount());
    }

    @Override
    protected Plan layout() {
        return function.resultNested() ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        ColumnType returnType = function.inferResultType() ? expression(1, 1).getType() : function.resultType();
        Schema schema = (returnType == null) ? Schema.inputs(this, 1) : Schema.of(returnType);
        return new Meta(schema);
    }

    @Override
    protected Table execute(Table layout, Table table) {
        int resultSize = Util.toIntSize(layout);
        DoubleColumn keys = expression(1, 0).evaluate();
        List<Expression> arguments = expressions(1, 1);

        return switch (function) {
            case COUNT -> count(table, keys, resultSize);
            case SUM -> sum(table, keys, arguments, resultSize);
            case AVERAGE -> average(table, keys, arguments, resultSize);
            case MIN -> min(table, keys, arguments, resultSize);
            case MAX -> max(table, keys, arguments, resultSize);
            case MODE -> mode(table, keys, arguments, resultSize);
            case CORRELATION -> correlation(table, keys, arguments, resultSize);
            case FIRST -> first(table, keys, resultSize);
            case SINGLE -> single(table, keys, resultSize);
            case LAST -> last(table, keys, resultSize);
            case FIRSTS -> firsts(table, keys, arguments, resultSize);
            case LASTS -> lasts(table, keys, arguments, resultSize);
            case PERIOD_SERIES -> periodSeries(table, keys, arguments, resultSize);
        };
    }

    private static Table count(Table table, DoubleColumn keys, int resultSize) {
        long tableSize = table.size();
        double[] counts = new double[resultSize];

        for (long i = 0; i < tableSize; i++) {
            int index = Util.toIntIndex(keys.get(i));
            counts[index]++;
        }

        return new LocalTable(new DoubleDirectColumn(counts));
    }

    private static Table sum(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn values = arguments.get(0).evaluate();
        long tableSize = table.size();
        double[] sums = new double[resultSize];

        for (int i = 0; i < tableSize; i++) {
            int index = Util.toIntIndex(keys.get(i));
            sums[index] += values.get(i);
        }

        return new LocalTable(new DoubleDirectColumn(sums));
    }

    private static Table average(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn values = arguments.get(0).evaluate();
        long tableSize = table.size();
        double[] averages = new double[resultSize];
        Arrays.fill(averages, Double.NaN);

        double sum = 0;
        double count = 0;
        int prev = 0;

        for (int i = 0; i < tableSize; i++) {
            int next = Util.toIntIndex(keys.get(i));
            Util.verify(prev <= next);

            if (prev != next) {
                averages[prev] = sum / count;
                sum = 0;
                count = 0;
                prev = next;
            }

            sum += values.get(i);
            count++;
        }

        if (tableSize > 0) {
            averages[prev] = sum / count;
        }

        return new LocalTable(new DoubleDirectColumn(averages));
    }

    private static Table min(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn values = arguments.get(0).evaluate();
        long tableSize = table.size();
        double[] mins = new double[resultSize];
        Arrays.fill(mins, Double.NaN);

        double min = Double.POSITIVE_INFINITY;
        int prev = 0;

        for (int i = 0; i < tableSize; i++) {
            int next = Util.toIntIndex(keys.get(i));
            Util.verify(prev <= next);

            if (prev != next) {
                mins[prev] = min;
                min = Double.POSITIVE_INFINITY;
                prev = next;
            }

            min = Math.min(min, values.get(i));
        }

        if (tableSize > 0) {
            mins[prev] = min;
        }

        return new LocalTable(new DoubleDirectColumn(mins));
    }

    private static Table max(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn values = arguments.get(0).evaluate();
        long tableSize = table.size();
        double[] maxs = new double[resultSize];
        Arrays.fill(maxs, Double.NaN);

        double max = Double.NEGATIVE_INFINITY;
        int prev = 0;

        for (int i = 0; i < tableSize; i++) {
            int next = Util.toIntIndex(keys.get(i));
            Util.verify(prev <= next);

            if (prev != next) {
                maxs[prev] = max;
                max = Double.NEGATIVE_INFINITY;
                prev = next;
            }

            max = Math.max(max, values.get(i));
        }

        if (tableSize > 0) {
            maxs[prev] = max;
        }

        return new LocalTable(new DoubleDirectColumn(maxs));
    }

    private static Table mode(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        Column values = arguments.get(0).evaluate();

        if (values instanceof DoubleColumn numbers) {
            return mode(table, keys, numbers, resultSize);
        }

        if (values instanceof StringColumn strings) {
            return mode(table, keys, strings, resultSize);
        }

        throw new IllegalArgumentException();
    }

    private static LocalTable mode(Table table, DoubleColumn keys, DoubleColumn values, int resultSize) {
        long size = table.size();
        double[] modes = new double[resultSize];
        Arrays.fill(modes, Double.NaN);
        long from = 0;
        int prev = 0;

        for (long i = 0; i < size; i++) {
            int next = (int) keys.get(i);

            if (next > prev) {
                modes[prev] = SimpleAggregateLocal.mode(values, from, i);
                prev = next;
                from = i;
            }
        }

        if (size > 0) {
            modes[prev] = SimpleAggregateLocal.mode(values, from, size);
        }

        return new LocalTable(new DoubleDirectColumn(modes));
    }

    private static LocalTable mode(Table table, DoubleColumn keys, StringColumn values, int resultSize) {
        long size = table.size();
        String[] modes = new String[resultSize];
        long from = 0;
        int prev = 0;

        for (long i = 0; i < size; i++) {
            int next = (int) keys.get(i);

            if (next > prev) {
                modes[prev] = SimpleAggregateLocal.mode(values, from, i);
                prev = next;
                from = i;
            }
        }

        if (size > 0) {
            modes[prev] = SimpleAggregateLocal.mode(values, from, size);
        }

        return new LocalTable(new StringDirectColumn(modes));
    }

    private static Table correlation(Table table, DoubleColumn keys, List<Expression> arguments, int resultSize) {
        DoubleColumn xs = arguments.get(0).evaluate();
        DoubleColumn ys = arguments.get(1).evaluate();

        long size = table.size();
        double[] correlations = new double[resultSize];
        Arrays.fill(correlations, Double.NaN);
        long from = 0;
        int prev = 0;

        for (long i = 0; i < size; i++) {
            int next = (int) keys.get(i);

            if (next > prev) {
                correlations[prev] = SimpleAggregateLocal.correlation(xs, ys, from, i);
                prev = next;
                from = i;
            }
        }

        if (size > 0) {
            correlations[prev] = SimpleAggregateLocal.correlation(xs, ys, from, size);
        }

        return new LocalTable(new DoubleDirectColumn(correlations));
    }

    private static Table first(Table table, DoubleColumn keys, int resultSize) {
        long tableSize = table.size();
        long[] refs = new long[resultSize];
        Arrays.fill(refs, -1);

        for (long i = 0; i < tableSize; i++) {
            int index = Util.toIntIndex(keys.get(i));

            if (refs[index] == -1) {
                refs[index] = i;
            }
        }

        return LocalTable.indirectOf(table, refs);
    }

    private static Table single(Table table, DoubleColumn keys, int resultSize) {
        long tableSize = table.size();
        long[] refs = new long[resultSize];
        Arrays.fill(refs, -1);

        for (long i = 0; i < tableSize; i++) {
            int index = Util.toIntIndex(keys.get(i));
            long ref = refs[index];

            if (ref == -1) {
                refs[index] = i;
            } else if (ref >= 0) {
                refs[index] = -2; // 2+ matches, -2 is considered NA_REF as well as -1
            }
        }

        return LocalTable.indirectOf(table, refs);
    }

    private static Table last(Table table, DoubleColumn keys, int resultSize) {
        long tableSize = table.size();
        long[] refs = new long[resultSize];
        Arrays.fill(refs, -1);

        for (long i = 0; i < tableSize; i++) {
            int index = Util.toIntIndex(keys.get(i));
            refs[index] = i;
        }

        return LocalTable.indirectOf(table, refs);
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
