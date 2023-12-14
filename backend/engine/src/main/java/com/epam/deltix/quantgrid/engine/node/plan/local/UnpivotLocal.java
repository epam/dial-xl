package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.List;

public class UnpivotLocal extends Plan1<Table, Table> {

    private final String[] names;

    public UnpivotLocal(Plan source, List<Expression> columns, String[] names) {
        super(source, columns);
        this.names = names;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    protected ColumnType type() {
        List<Expression> columns = expressions(0);
        ColumnType type = columns.isEmpty() ? ColumnType.DOUBLE : null;
        return columns.stream().map(Expression::getType).reduce(type, ColumnType::closest);
    }

    @Override
    protected Meta meta() {
        Schema left = Schema.inputs(this, 0);
        Schema right = Schema.of(ColumnType.STRING, type());
        return new Meta(Schema.of(left, right));
    }

    @Override
    protected Table execute(Table source) {
        int columns = names.length;
        long results = columns * source.size();

        Table left = LocalTable.lambdaOf(source, row -> row(row, columns), results);
        Table right = switch (type()) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> unpivotDoubles(columns, results);
            case STRING -> unpivotStrings(columns, results);
            case PERIOD_SERIES -> unpivotSeries(columns, results);
        };

        return LocalTable.compositeOf(left, right);
    }

    private Table unpivotDoubles(int columns, long results) {
        DoubleColumn[] doubles = expressions(0).stream()
                .map(e -> (DoubleColumn) e.evaluate()).toArray(DoubleColumn[]::new);

        return new LocalTable(
                new StringLambdaColumn(index -> names[column(index, columns)], results),
                new DoubleLambdaColumn(index -> doubles[column(index, columns)].get(row(index, columns)), results)
        );
    }

    private Table unpivotStrings(int columns, long results) {
        StringColumn[] strings = expressions(0).stream()
                .map(e -> (StringColumn) e.evaluate()).toArray(StringColumn[]::new);

        return new LocalTable(
                new StringLambdaColumn(index -> names[column(index, columns)], results),
                new StringLambdaColumn(index -> strings[column(index, columns)].get(row(index, columns)), results)
        );
    }

    private Table unpivotSeries(int columns, long results) {
        PeriodSeriesColumn[] series = expressions(0).stream()
                .map(e -> (PeriodSeriesColumn) e.evaluate()).toArray(PeriodSeriesColumn[]::new);

        return new LocalTable(
                new StringLambdaColumn(index -> names[column(index, columns)], results),
                new PeriodSeriesLambdaColumn(index -> series[column(index, columns)].get(row(index, columns)), results)
        );
    }

    private static int column(long index, int columns) {
        return (int) (index % columns);
    }

    private static int row(long index, int columns) {
        return (int) (index / columns);
    }
}