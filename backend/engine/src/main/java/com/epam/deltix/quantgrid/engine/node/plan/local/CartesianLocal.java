package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;

import java.util.ArrayList;
import java.util.List;

public class CartesianLocal extends Plan2<Table, Table, Table> {

    public CartesianLocal(Plan left, Plan right) {
        super(sourceOf(left), sourceOf(right));
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0, 1));
    }

    @Override
    public Table execute(Table left, Table right) {
        long leftSize = left.size();
        long rightSize = right.size();
        long totalSize = Math.multiplyExact(leftSize, rightSize);

        List<Column> columns = new ArrayList<>(left.getColumnCount() + right.getColumnCount());

        for (Column column : left.getColumns()) {
            Column result = createLeftColumn(column, rightSize, totalSize);
            columns.add(result);
        }

        for (Column column : right.getColumns()) {
            Column result = creareRightColumn(column, rightSize, totalSize);
            columns.add(result);
        }

        return new LocalTable(columns);
    }

    public boolean isOnLeft(Get get) {
        Util.verify(get.plan() == this);
        Schema schema = getMeta().getSchema();
        int planIndex = schema.getInput(get.getColumn());
        return planIndex == 0;
    }

    private static Column createLeftColumn(Column left, long rightSize, long totalSize) {
        if (left instanceof DoubleColumn column) {
            return new DoubleLambdaColumn(index -> column.get(index / rightSize), totalSize);
        }

        if (left instanceof StringColumn column) {
            return new StringLambdaColumn(index -> column.get(index / rightSize), totalSize);
        }

        if (left instanceof PeriodSeriesColumn column) {
            return new PeriodSeriesLambdaColumn(index -> column.get(index / rightSize), totalSize);
        }

        throw new IllegalArgumentException("Unsupported colum type: " + left.getClass());
    }

    private static Column creareRightColumn(Column right, long rightSize, long totalSize) {
        if (right instanceof DoubleColumn column) {
            return new DoubleLambdaColumn(index -> column.get(index % rightSize), totalSize);
        }

        if (right instanceof StringColumn column) {
            return new StringLambdaColumn(index -> column.get(index % rightSize), totalSize);
        }

        if (right instanceof PeriodSeriesColumn column) {
            return new PeriodSeriesLambdaColumn(index -> column.get(index % rightSize), totalSize);
        }

        throw new IllegalArgumentException("Unsupported colum type: " + right.getClass());
    }
}
