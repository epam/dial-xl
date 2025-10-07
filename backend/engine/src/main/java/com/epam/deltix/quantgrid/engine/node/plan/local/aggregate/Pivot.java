package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.List;

public class Pivot implements AggregateFunction {

    private final Object2IntMap<String> positions = new Object2IntOpenHashMap<>();
    private final List<String> names = new ArrayList<>();
    private final List<ColumnType> types = new ArrayList<>();

    public Pivot(StringColumn columns, ColumnType type) {
        positions.defaultReturnValue(-1);
        for (int i = 0; i < columns.size(); i++) {
            String name = columns.get(i);
            positions.put(name, i);
            names.add(name);
            types.add(type);
        }
    }

    @Override
    public StructColumn aggregate(DoubleColumn rows, List<Column> args, int size) {
        StringColumn names = (StringColumn) args.get(0);
        Column values = (args.size() == 1) ? new DoubleLambdaColumn(index -> Doubles.EMPTY, rows.size()) : args.get(1);
        LocalTable table = pivot(rows, names, values, size);
        return new StructColumn(this.names, this.types, table);
    }

    private LocalTable pivot(DoubleColumn rows, StringColumn names, Column values, int size) {
        if (values instanceof DoubleColumn doubles) {
            return pivot(rows, names, doubles, size);
        }

        if (values instanceof StringColumn strings) {
            return pivot(rows, names, strings, size);
        }

        if (values instanceof PeriodSeriesColumn series) {
            return pivot(rows, names, series, size);
        }

        throw new IllegalArgumentException("Unsupported type: " + values.getClass());
    }

    private LocalTable pivot(DoubleColumn rows, StringColumn names, DoubleColumn values, int size) {
        double[][] matrix = new double[positions.size()][];

        for (int i = 0; i < matrix.length; i++) {
            matrix[i] = new double[size];
            Arrays.fill(matrix[i], Doubles.EMPTY);
        }

        for (long i = 0; i < rows.size(); i++) {
            String name = names.get(i);
            int column = positions.getInt(name);

            if (column >= 0) {
                int row = (int) rows.get(i);
                matrix[column][row] = values.get(i);
            }
        }

        Column[] columns = new Column[matrix.length];

        for (int i = 0; i < columns.length; i++) {
            columns[i] = new DoubleDirectColumn(matrix[i]);
        }

        return new LocalTable(columns);
    }

    private LocalTable pivot(DoubleColumn rows, StringColumn names, StringColumn values, int size) {
        String[][] matrix = new String[positions.size()][];

        for (int i = 0; i < matrix.length; i++) {
            matrix[i] = new String[size];
            Arrays.fill(matrix[i], Strings.EMPTY);
        }

        for (long i = 0; i < rows.size(); i++) {
            String name = names.get(i);
            int column = positions.getInt(name);

            if (column >= 0) {
                int row = (int) rows.get(i);
                matrix[column][row] = values.get(i);
            }
        }

        Column[] columns = new Column[matrix.length];

        for (int i = 0; i < columns.length; i++) {
            columns[i] = new StringDirectColumn(matrix[i]);
        }

        return new LocalTable(columns);
    }

    private LocalTable pivot(DoubleColumn rows, StringColumn names, PeriodSeriesColumn values, int size) {
        PeriodSeries[][] matrix = new PeriodSeries[positions.size()][];

        for (int i = 0; i < matrix.length; i++) {
            matrix[i] = new PeriodSeries[size];
        }

        for (long i = 0; i < rows.size(); i++) {
            String name = names.get(i);
            int column = positions.getInt(name);

            if (column >= 0) {
                int row = (int) rows.get(i);
                matrix[column][row] = values.get(i);
            }
        }

        Column[] columns = new Column[matrix.length];

        for (int i = 0; i < columns.length; i++) {
            columns[i] = new PeriodSeriesDirectColumn(matrix[i]);
        }

        return new LocalTable(columns);
    }
}