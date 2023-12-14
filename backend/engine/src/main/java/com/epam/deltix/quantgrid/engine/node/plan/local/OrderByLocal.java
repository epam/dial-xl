package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableComparator;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import it.unimi.dsi.fastutil.longs.LongArrays;

import java.util.List;

public class OrderByLocal extends Plan1<Table, Table> {

    private final boolean[] ascending;

    public OrderByLocal(Plan source, List<Expression> keys, boolean[] ascending) {
        super(source, keys);
        this.ascending = ascending;
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
    public Table execute(Table table) {
        int size = Util.toIntSize(table);
        long[] refs = new long[size];

        for (int i = 0; i < size; i++) {
            refs[i] = i;
        }

        List<Expression> keys = expressions(0);
        TableComparator comparator = new TableComparator(keys, ascending);
        LongArrays.stableSort(refs, comparator);

        return LocalTable.indirectOf(table, refs);
    }
}
