package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.Table;

public class PivotNamesLocal extends Plan1<Table, Table> {

    public static final int MAX_NAMES = 10000;

    public PivotNamesLocal(Plan source) {
        super(source);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0));
    }

    @Override
    protected Table execute(Table source) {
        if (source.size() > MAX_NAMES) {
            throw new IllegalArgumentException("Too many distinct names in pivot: " + source.size());
        }

        return source;
    }
}