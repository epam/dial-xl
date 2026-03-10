package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.util.Doubles;

public class IndexLocal extends Plan2<Table, Table, Table> {

    public IndexLocal(Plan container, Plan table, Expression index) {
        super(sourceOf(container, index), sourceOf(table));
    }

    @Override
    protected Plan layout() {
        return plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 1));
    }

    @Override
    protected Table execute(Table container, Table table) {
        DoubleColumn indices = expression(0, 0).evaluate();
        long rows = table.size();
        int size = Util.toIntSize(container.size());
        long[] refs = new long[size];

        for (int i = 0; i < size; i++) {
            double index = indices.get(i);
            long ref = Util.NA_REF;

            if (Doubles.isValue(index) && index >= 1 && index < rows + 1) {
                ref = ((long) index) - 1;
            }

            refs[i] = ref;
        }

        return LocalTable.indirectOf(table, refs);
    }
}
