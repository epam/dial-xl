package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;

public final class Scalar extends Plan0<Table> {

    private static final Meta META = new Meta(Schema.of(new ColumnType[0]));
    private static final LocalTable TABLE = new LocalTable(1);

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return META;
    }

    @Override
    public Table execute() {
        return TABLE;
    }
}
