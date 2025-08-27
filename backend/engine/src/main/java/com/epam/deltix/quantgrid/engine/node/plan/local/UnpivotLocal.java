package com.epam.deltix.quantgrid.engine.node.plan.local;

import java.util.ArrayList;
import java.util.List;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StructColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;

public class UnpivotLocal extends PlanN<Table, Table> {

    private final String[] names;
    private final ColumnType type;

    public UnpivotLocal(Plan source, List<Expression> columns, String[] names, ColumnType type) {
        super(List.of(sourceOf(source, columns)));
        this.names = names;
        this.type = type;
    }

    public UnpivotLocal(Plan source, List<Expression> columns, String[] names, ColumnType type,
                        Plan allName, Expression allNames) {
        super(List.of(sourceOf(source, columns), sourceOf(allName, allNames)));
        this.names = names;
        this.type = type;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        Schema left = Schema.inputs(this, 0);
        Schema right = Schema.of(ColumnType.STRING, type);
        return new Meta(Schema.of(left, right));
    }

    @Override
    protected Table execute(List<Table> tables) {
        Table table = tables.get(0);
        List<Column> columns = expressions(0).stream()
                .map(expression -> (Column) expression.evaluate()).toList();

        String[] names = this.names;

        if (tables.size() == 2) {
            names = allNames();
            columns = rearrangeColumns(table, names, columns);
        }

        int cols = columns.size();
        long rows = table.size() * cols;

        Table left = LocalTable.lambdaOf(table, row -> row(row, cols), rows);
        Table right = switch (type) {
            case DOUBLE -> unpivotDoubles(names, columns, rows);
            case STRING -> unpivotStrings(names, columns, rows);
            case PERIOD_SERIES -> unpivotSeries(names, columns, rows);
            default -> throw new IllegalArgumentException("Unsupported type: " + type);
        };

        return LocalTable.compositeOf(left, right);
    }

    private String[] allNames() {
        StringColumn column = expression(1, 0).evaluate();
        String[] names = new String[Util.toIntSize(column.size())];

        for (int i = 0; i < names.length; i++) {
            names[i] = column.get(i);
        }

        return names;
    }

    private List<Column> rearrangeColumns(Table table, String[] allNames, List<Column> columns) {
        StructColumn pivot = (StructColumn) columns.get(columns.size() - 1);

        Object2IntMap<String> staticNames = new Object2IntOpenHashMap<>();
        staticNames.defaultReturnValue(-1);

        Object2IntMap<String> dynamicNames = new Object2IntOpenHashMap<>();
        dynamicNames.defaultReturnValue(-1);

        for (int i = 0; i < names.length; i++) {
            String name = names[i];
            staticNames.put(name, i);
        }

        for (int i = 0; i < pivot.getNames().size(); i++) {
            String name = pivot.getNames().get(i);
            dynamicNames.put(name, i);
        }

        List<Column> results = new ArrayList<>();

        for (String name : allNames) {
            int position = staticNames.getOrDefault(name, -1);

            if (position >= 0) {
                Column column = columns.get(position);
                results.add(column);
                continue;
            }

            position = dynamicNames.getOrDefault(name, -1);

            if (position >= 0) {
                Column column = pivot.getTable().getColumn(position);
                results.add(column);
                continue;
            }

            Column column = missingColumn(table.size());
            results.add(column);
        }

        return results;
    }

    private Column missingColumn(long rows) {
        return switch (type) {
            case DOUBLE -> new DoubleLambdaColumn(index -> Doubles.EMPTY, rows);
            case STRING -> new StringLambdaColumn(index -> Strings.EMPTY, rows);
            case PERIOD_SERIES -> null;
            default -> throw new IllegalArgumentException("Unsupported type: " + type);
        };
    }

    private Table unpivotDoubles(String[] names, List<Column> columns, long rows) {
        int cols = columns.size();
        DoubleColumn[] doubles = columns.stream()
                .map(column -> (DoubleColumn) column).toArray(DoubleColumn[]::new);

        return new LocalTable(
                new StringLambdaColumn(index -> names[column(index, cols)], rows),
                new DoubleLambdaColumn(index -> doubles[column(index, cols)].get(row(index, cols)), rows)
        );
    }

    private Table unpivotStrings(String[] names, List<Column> columns, long rows) {
        int cols = columns.size();
        StringColumn[] strings = columns.stream()
                .map(column -> (StringColumn) column).toArray(StringColumn[]::new);

        return new LocalTable(
                new StringLambdaColumn(index -> names[column(index, cols)], rows),
                new StringLambdaColumn(index -> strings[column(index, cols)].get(row(index, cols)), rows)
        );
    }

    private Table unpivotSeries(String[] names, List<Column> columns, long rows) {
        int cols = columns.size();
        PeriodSeriesColumn[] series = columns.stream()
                .map(column -> (PeriodSeriesColumn) column).toArray(PeriodSeriesColumn[]::new);

        return new LocalTable(
                new StringLambdaColumn(index -> names[column(index, cols)], rows),
                new PeriodSeriesLambdaColumn(index -> series[column(index, cols)].get(row(index, cols)), rows)
        );
    }

    private static int column(long index, int columns) {
        return (int) (index % columns);
    }

    private static int row(long index, int columns) {
        return (int) (index / columns);
    }
}