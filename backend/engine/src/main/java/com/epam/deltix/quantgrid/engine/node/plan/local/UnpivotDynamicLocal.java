package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.ints.IntArrays;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import org.jetbrains.annotations.Nullable;

import java.util.Arrays;
import java.util.List;

public class UnpivotDynamicLocal extends PlanN<Table, Table> {

    private final String[] sourceNames;

    public UnpivotDynamicLocal(Plan source, Expression sourceKey, List<Expression> sourceValues,
                               Plan allName, Expression allNameKey,
                               Plan pivot, @Nullable Expression pivotKey, Expression pivotName, Expression pivotValue,
                               String[] sourceNames) {
        super(
                sourceOf(source, Util.listOf(sourceKey, sourceValues)),
                sourceOf(allName, allNameKey),
                sourceOf(pivot, Util.listSkipNulls(pivotKey, pivotName, pivotValue))
        );
        this.sourceNames = sourceNames;
    }

    public List<Expression> getSourceValues() {
        return expressions(0, 1);
    }

    public boolean hasPivotKeys() {
        return expressions(2).size() == 3;
    }

    @Nullable
    public Expression getPivotKeys() {
        return hasPivotKeys() ? expression(2, 0) : null;
    }

    public Expression getPivotNames() {
        return expression(2, hasPivotKeys() ? 1 : 0);
    }

    public Expression getPivotValues() {
        return expression(2, hasPivotKeys() ? 2 : 1);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    protected ColumnType type() {
        ColumnType type = getPivotValues().getType();
        return getSourceValues().stream().map(Expression::getType).reduce(type, ColumnType::closest);
    }

    @Override
    protected Meta meta() {
        Schema left = Schema.inputs(this, 0);
        Schema right = Schema.of(ColumnType.STRING, type());
        return new Meta(Schema.of(left, right));
    }

    @Override
    protected Table execute(List<Table> sources) {
        Table source = sources.get(0);
        Table pivot = sources.get(2);

        DoubleColumn sourceKeys = expression(0, 0).evaluate();
        StringColumn allNames = expression(1, 0).evaluate();

        DoubleColumn pivotKeys = hasPivotKeys() ? getPivotKeys().evaluate() : null;
        StringColumn pivotNames = getPivotNames().evaluate();
        Column pivotValues = getPivotValues().evaluate();

        Object2IntMap<String> mapping = mapping(allNames);
        Index index = Index.build(pivot, pivotKeys);

        int columns = mapping.size();
        int results = Util.toIntSize(columns * sourceKeys.size());

        Table left = LocalTable.lambdaOf(source, row -> row(row, columns), results);
        StringLambdaColumn names = new StringLambdaColumn(row -> allNames.get(column(row, columns)), results);

        Column values = switch (type()) {
            case DOUBLE, INTEGER, BOOLEAN, DATE ->
                    unpivotDoubles(mapping, index, sourceKeys, pivotNames, (DoubleColumn) pivotValues);
            case STRING ->
                    unpivotStrings(mapping, index, sourceKeys, pivotNames, (StringColumn) pivotValues);
            case PERIOD_SERIES ->
                    unpivotSeries(mapping, index, sourceKeys, pivotNames, (PeriodSeriesColumn) pivotValues);
        };

        return LocalTable.compositeOf(left, new LocalTable(names, values));
    }

    private Column unpivotDoubles(Object2IntMap<String> mapping, Index index,
                                  DoubleColumn sourceKeys, StringColumn pivotNames, DoubleColumn pivotValues) {
        int columns = mapping.size();
        int sources = Util.toIntSize(sourceKeys.size());
        int results = Util.toIntSize((long) columns * sources);

        double[] values = new double[results];
        Arrays.fill(values, Doubles.EMPTY);

        for (int row = 0, offset = 0; row < sources; row++, offset += columns) {
            double key = sourceKeys.get(row);

            for (int start = index.start(key), end = index.end(key); start < end; start++) {
                String name = pivotNames.get(start);
                int position = offset + mapping.getInt(name);
                values[position] = pivotValues.get(start);
            }
        }

        for (int column = 0; column < sourceNames.length; column++) {
            String name = sourceNames[column];
            DoubleColumn numbers = expression(0, column + 1).evaluate();
            int position = mapping.getInt(name);

            for (int row = 0; row < sources; row++, position += columns) {
                values[position] = numbers.get(row);
            }
        }

        return new DoubleDirectColumn(values);
    }

    private Column unpivotStrings(Object2IntMap<String> mapping, Index index,
                                  DoubleColumn sourceKeys, StringColumn pivotNames, StringColumn pivotValues) {
        int columns = mapping.size();
        int sources = Util.toIntSize(sourceKeys.size());
        int results = Util.toIntSize((long) columns * sources);

        String[] values = new String[results];
        Arrays.fill(values, Strings.EMPTY);

        for (int row = 0, offset = 0; row < sources; row++, offset += columns) {
            double key = sourceKeys.get(row);

            for (int start = index.start(key), end = index.end(key); start < end; start++) {
                String name = pivotNames.get(start);
                int position = offset + mapping.getInt(name);
                values[position] = pivotValues.get(start);
            }
        }

        for (int column = 0; column < sourceNames.length; column++) {
            String name = sourceNames[column];
            StringColumn strings = expression(0, column + 1).evaluate();
            int position = mapping.getInt(name);

            for (int row = 0; row < sources; row++, position += columns) {
                values[position] = strings.get(row);
            }
        }

        return new StringDirectColumn(values);
    }

    private Column unpivotSeries(Object2IntMap<String> mapping, Index index,
                                 DoubleColumn sourceKeys, StringColumn pivotNames, PeriodSeriesColumn pivotValues) {

        int columns = mapping.size();
        int sources = Util.toIntSize(sourceKeys.size());
        int results = Util.toIntSize((long) columns * sources);

        PeriodSeries[] values = new PeriodSeries[results];

        for (int row = 0, offset = 0; row < sources; row++, offset += columns) {
            double key = sourceKeys.get(row);

            for (int start = index.start(key), end = index.end(key); start < end; start++) {
                String name = pivotNames.get(start);
                int position = offset + mapping.getInt(name);
                values[position] = pivotValues.get(start);
            }
        }

        for (int column = 0; column < sourceNames.length; column++) {
            String name = sourceNames[column];
            PeriodSeriesColumn series = expression(0, column + 1).evaluate();
            int position = mapping.getInt(name);

            for (int row = 0; row < sources; row++, position += columns) {
                values[position] = series.get(row);
            }
        }

        return new PeriodSeriesDirectColumn(values);
    }

    private static Object2IntMap<String> mapping(StringColumn names) {
        int size = Util.toIntSize(names.size());
        Object2IntMap<String> mapping = new Object2IntOpenHashMap<>(size);
        mapping.defaultReturnValue(Integer.MIN_VALUE);

        for (int i = 0; i < size; i++) {
            String name = names.get(i);
            int prev = mapping.put(name, i);
            Util.verify(prev < 0);
        }

        return mapping;
    }

    private static int row(long index, int columns) {
        return (int) (index / columns);
    }

    private static long column(long index, int columns) {
        return index % columns;
    }

    private record Index(int[] start, int[] end, int min, int max) {

        static final Index EMPTY = new Index(IntArrays.EMPTY_ARRAY, IntArrays.EMPTY_ARRAY, 0, 0);

        static Index build(Table table, @Nullable DoubleColumn keys) {
            int size = Util.toIntSize(table);
            if (size == 0) {
                return EMPTY;
            }

            if (keys == null) {
                return new Index(new int[] {0}, new int[] {size}, 0, 1);
            }

            int min = Util.toIntSize(keys.get(0));
            int max = Util.toIntSize(keys.get(size - 1)) + 1;
            int count = max - min;

            int[] start = new int[count];
            int[] end = new int[count];
            int prev = min;

            for (int i = 0; i < size; i++) {
                int key = Util.toIntIndex(keys.get(i));
                int index = key - min;
                Util.verify(key >= prev && key < max);

                if (prev != key) {
                    start[index] = i;
                    prev = key;
                }

                end[index] = i + 1;
            }

            return new Index(start, end, min, max);
        }

        int start(double key) {
            return (min <= key && key < max) ? start[(int) key - min] : -1;
        }

        int end(double key) {
            return (min <= key && key < max) ? end[(int) key - min] : -1;
        }
    }
}