package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.Double2IntOpenHashMap;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import org.jetbrains.annotations.Nullable;

import java.util.List;

public class SimpleAggregateLocal extends Plan2<Table, Table, Table> {

    private final AggregateFunction function;

    public SimpleAggregateLocal(AggregateFunction function, Plan layout, Plan source, Expression... arguments) {
        super(sourceOf(layout), sourceOf(source, arguments));
        this.function = function;
        Util.verify(arguments.length == function.argumentCount());
    }

    @Override
    protected Plan layout() {
        return function.resultNested() ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        ColumnType returnType = function.inferResultType() ? expression(1, 0).getType() : function.resultType();
        Schema schema = (returnType == null) ? Schema.inputs(this, 1) : Schema.of(returnType);
        return new Meta(schema);
    }

    @Override
    protected Table execute(Table layout, Table table) {
        Util.verify(layout.size() == 1);
        List<Expression> arguments = expressions(1);

        return switch (function) {
            case COUNT -> count(table);
            case SUM -> sum(table, arguments);
            case AVERAGE -> average(table, arguments);
            case MIN -> min(table, arguments);
            case MAX -> max(table, arguments);
            case MODE -> mode(table, arguments);
            case CORRELATION -> correlation(table, arguments);
            case FIRST -> first(table);
            case SINGLE -> single(table);
            case LAST -> last(table);
            case FIRSTS -> firsts(table, arguments);
            case LASTS -> lasts(table, arguments);
            case PERIOD_SERIES -> periodSeries(table, arguments);
        };
    }

    private static Table count(Table table) {
        return new LocalTable(new DoubleDirectColumn((double) table.size()));
    }

    private static Table sum(Table table, List<Expression> arguments) {
        DoubleColumn values = arguments.get(0).evaluate();
        long size = table.size();
        double sum = 0;

        for (long i = 0; i < size; i++) {
            sum += values.get(i);
        }

        return new LocalTable(new DoubleDirectColumn(sum));
    }

    private static Table average(Table table, List<Expression> arguments) {
        DoubleColumn values = arguments.get(0).evaluate();
        long size = table.size();
        double sum = 0;

        for (long i = 0; i < size; i++) {
            sum += values.get(i);
        }

        double average = sum / size;
        return new LocalTable(new DoubleDirectColumn(average));
    }

    private static Table min(Table table, List<Expression> arguments) {
        DoubleColumn values = arguments.get(0).evaluate();
        long size = table.size();
        double min = (size == 0) ? Double.NaN : Double.POSITIVE_INFINITY;

        for (long i = 0; i < size; i++) {
            min = Math.min(min, values.get(i));
        }

        return new LocalTable(new DoubleDirectColumn(min));
    }

    private static Table max(Table table, List<Expression> arguments) {
        DoubleColumn values = arguments.get(0).evaluate();
        long size = table.size();
        double max = (size == 0) ? Double.NaN : Double.NEGATIVE_INFINITY;

        for (long i = 0; i < size; i++) {
            max = Math.max(max, values.get(i));
        }

        return new LocalTable(new DoubleDirectColumn(max));
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

    @Nullable
    static String mode(StringColumn values, long from, long to) {
        Object2IntOpenHashMap<String> map = new Object2IntOpenHashMap<>();
        long size = to - from;
        String mode = null;
        int modeCount = -1;

        for (long i = from; i < to; i++) {
            String value = values.get(i);
            if (Util.isNa(value)) {
                return null;
            }

            int count = map.addTo(value, 1);
            if (count > modeCount) {
                mode = value;
                modeCount = count;
            }
        }

        return (map.size() == size) ? null : mode;
    }

    static double mode(DoubleColumn column, long from, long to) {
        Double2IntOpenHashMap map = new Double2IntOpenHashMap();
        long size = to - from;
        double mode = Double.NaN;
        int modeCount = -1;

        for (long i = from; i < to; i++) {
            double value = column.get(i);
            if (Util.isNa(value)) {
                return Double.NaN;
            }

            int count = map.addTo(value, 1);
            if (count > modeCount) {
                mode = value;
                modeCount = count;
            }
        }

        return (map.size() == size) ? Double.NaN : mode;
    }

    private static Table correlation(Table table, List<Expression> arguments) {
        DoubleColumn xs = arguments.get(0).evaluate();
        DoubleColumn ys = arguments.get(1).evaluate();

        long size = table.size();
        double correlation = correlation(xs, ys, 0, size);

        return new LocalTable(new DoubleDirectColumn(correlation));
    }

    static double correlation(DoubleColumn xs, DoubleColumn ys, long from, long to) {
        if (to <= from) {
            return Double.NaN;
        }

        long n = to - from;
        double sumX = 0.0;
        double sumY = 0.0;
        double sumXX = 0.0;
        double sumYY = 0.0;
        double sumXY = 0.0;

        for (long i = from; i < to; i++) {
            double x = xs.get(i);
            double y = ys.get(i);

            sumX += x;
            sumY += y;
            sumXX += x * x;
            sumYY += y * y;
            sumXY += x * y;
        }

        double covariant = sumXY / n - sumX * sumY / n / n;
        double sigmaX = Math.sqrt(sumXX / n - sumX * sumX / n / n);
        double sigmaY = Math.sqrt(sumYY / n - sumY * sumY / n / n);

        return covariant / sigmaX / sigmaY;
    }

    private static Table first(Table table) {
        long size = table.size();
        long[] refs = {(size == 0) ? -1 : 0};
        return LocalTable.indirectOf(table, refs);
    }

    private static Table single(Table table) {
        long size = table.size();
        long[] refs = {(size == 1) ? 0 : -1};
        return LocalTable.indirectOf(table, refs);
    }

    private static Table last(Table table) {
        long size = table.size();
        long[] refs = {(size == 0) ? -1 : (size - 1)};
        return LocalTable.indirectOf(table, refs);
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
        return (limit >= size) ? table : LocalTable.lambdaOf(table, key -> key + offset , limit);
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
            Util.verify(!Util.isNa(offset), "Timestamp column has invalid values");
            Util.verify(offset > end, "Timestamp column is not sorted or has duplicate values");

            // let's decide what to do with bugged date 1900-02-29
            /*if (ExcelDateTime.isBuggedDate(timestamp)) {
                continue;
            }*/

            while (++end < offset) {
                points.add(Double.NaN);
            }

            points.add(value);
        }

        return new PeriodSeries(period, start, points);
    }
}
