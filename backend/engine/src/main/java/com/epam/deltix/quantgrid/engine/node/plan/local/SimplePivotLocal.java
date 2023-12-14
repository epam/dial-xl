package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan3;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.DoubleErrorColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesErrorColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringErrorColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.ObjectOpenHashSet;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

import java.util.Arrays;
import java.util.Set;

public class SimplePivotLocal extends Plan3<Table, Table, Table, Table> {

    @Getter
    private final String[] sourceNames;

    public SimplePivotLocal(Plan layout,
                            Plan source, Expression name, Expression value,
                            Plan names, Expression namesKey,
                            String[] sourceNames) {
        super(sourceOf(layout), sourceOf(source, name, value), sourceOf(names, namesKey));
        this.sourceNames = sourceNames;
    }

    public Plan getSource() {
        return plan(1);
    }

    public Expression getName() {
        return expression(1, 0);
    }

    public Expression getValue() {
        return expression(1, 1);
    }

    public Plan getNames() {
        return plan(2);
    }

    public Expression getNamesKey() {
        return expression(2, 0);
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        ColumnType type = expression(1, 1).getType();
        return new Meta(Schema.ofN(type, sourceNames.length));
    }

    @Override
    protected Table execute(Table layout, Table table, Table distinctNameSource) {
        long tableSize = table.size();
        StringColumn names = getName().evaluate();
        Column values = getValue().evaluate();
        StringColumn allNames = getNamesKey().evaluate();

        return pivot(null, names, values, allNames, sourceNames, tableSize, 1);
    }

    static LocalTable pivot(@Nullable DoubleColumn keys, StringColumn names, Column values,
                            StringColumn allNames, String[] resultNames,
                            long tableSize, int resultSize) {

        Set<String> allNamesSet = toSet(allNames);
        Object2IntMap<String> mapping = SimplePivotLocal.mapping(resultNames, allNamesSet);

        if (values instanceof DoubleColumn doubles) {
            return pivot(keys, names, doubles, mapping, resultNames, tableSize, resultSize);
        }

        if (values instanceof StringColumn strings) {
            return pivot(keys, names, strings, mapping, resultNames, tableSize, resultSize);
        }

        if (values instanceof PeriodSeriesColumn series) {
            return pivot(keys, names, series, mapping, resultNames, tableSize, resultSize);
        }

        throw new IllegalArgumentException("Unsupported type: " + values.getClass());
    }

    private static LocalTable pivot(@Nullable DoubleColumn keys, StringColumn names, DoubleColumn values,
                                    Object2IntMap<String> mapping, String[] resultNames,
                                    long tableSize, int resultSize) {

        double[][] matrix = new double[resultNames.length][];

        for (int i = 0; i < matrix.length; i++) {
            if (mapping.containsKey(resultNames[i])) {
                matrix[i] = new double[resultSize];
                Arrays.fill(matrix[i], Double.NaN);
            }
        }

        for (long i = 0; i < tableSize; i++) {
            String name = names.get(i);
            int column = mapping.getInt(name);

            if (column >= 0) {
                int row = (keys == null) ? 0 : Util.toIntIndex(keys.get(i));
                matrix[column][row] = values.get(i);
            }
        }

        DoubleColumn[] columns = new DoubleColumn[resultNames.length];

        for (int i = 0; i < columns.length; i++) {
            if (mapping.containsKey(resultNames[i])) {
                columns[i] = new DoubleDirectColumn(matrix[i]);
            } else {
                columns[i] = new DoubleErrorColumn(missingFieldError(resultNames[i]), resultSize);
            }
        }

        return new LocalTable(columns);
    }

    private static LocalTable pivot(@Nullable DoubleColumn keys, StringColumn names, StringColumn values,
                                    Object2IntMap<String> mapping, String[] resultNames,
                                    long tableSize, int resultSize) {

        String[][] matrix = new String[resultNames.length][];

        for (int i = 0; i < matrix.length; i++) {
            if (mapping.containsKey(resultNames[i])) {
                matrix[i] = new String[resultSize];
            }
        }

        for (long i = 0; i < tableSize; i++) {
            String name = names.get(i);
            int column = mapping.getInt(name);

            if (column >= 0) {
                int row = (keys == null) ? 0 : Util.toIntIndex(keys.get(i));
                matrix[column][row] = values.get(i);
            }
        }

        StringColumn[] columns = new StringColumn[resultNames.length];

        for (int i = 0; i < columns.length; i++) {
            if (mapping.containsKey(resultNames[i])) {
                columns[i] = new StringDirectColumn(matrix[i]);
            } else {
                columns[i] = new StringErrorColumn(missingFieldError(resultNames[i]), resultSize);
            }
        }

        return new LocalTable(columns);
    }

    private static LocalTable pivot(@Nullable DoubleColumn keys, StringColumn names, PeriodSeriesColumn values,
                                    Object2IntMap<String> mapping, String[] resultNames, long tableSize,
                                    int resultSize) {

        PeriodSeries[][] matrix = new PeriodSeries[resultNames.length][];

        for (int i = 0; i < matrix.length; i++) {
            if (mapping.containsKey(resultNames[i])) {
                matrix[i] = new PeriodSeries[resultSize];
            }
        }

        for (long i = 0; i < tableSize; i++) {
            String name = names.get(i);
            int column = mapping.getInt(name);

            if (column >= 0) {
                int row = (keys == null) ? 0 : Util.toIntIndex(keys.get(i));
                matrix[column][row] = values.get(i);
            }
        }

        PeriodSeriesColumn[] columns = new PeriodSeriesColumn[resultNames.length];

        for (int i = 0; i < columns.length; i++) {
            if (mapping.containsKey(resultNames[i])) {
                columns[i] = new PeriodSeriesDirectColumn(matrix[i]);
            } else {
                columns[i] = new PeriodSeriesErrorColumn(missingFieldError(resultNames[i]), resultSize);
            }
        }

        return new LocalTable(columns);
    }

    private static Object2IntMap<String> mapping(String[] names, Set<String> allNames) {
        Object2IntMap<String> mapping = new Object2IntOpenHashMap<>(names.length);
        mapping.defaultReturnValue(-1);

        for (int i = 0; i < names.length; i++) {
            String name = names[i];
            if (allNames.contains(name)) {
                int prev = mapping.put(name, i);
                Util.verify(prev == -1, "Names are not unique");
            }
        }

        return mapping;
    }

    private static Set<String> toSet(StringColumn stringColumn) {
        int size = Util.toIntSize(stringColumn);
        Set<String> set = new ObjectOpenHashSet<>(size);
        for (int i = 0; i < size; i++) {
            set.add(stringColumn.get(i));
        }
        return set;
    }

    private static RuntimeException missingFieldError(String resultName) {
        return new IllegalArgumentException("Field '%s' is missing".formatted(resultName));
    }
}
