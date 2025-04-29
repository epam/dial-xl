package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.ErrorColumn;
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
        long size = Math.multiplyExact(left.size(), right.size());
        return LocalTable.compositeOf(
                LocalTable.lambdaOf(left, index -> index / right.size(), size),
                LocalTable.lambdaOf(right, index -> index % right.size(), size)
        );
    }

    public boolean isOnLeft(Get get) {
        Util.verify(get.plan() == this);
        Schema schema = getMeta().getSchema();
        int planIndex = schema.getInput(get.getColumn());
        return planIndex == 0;
    }
}
