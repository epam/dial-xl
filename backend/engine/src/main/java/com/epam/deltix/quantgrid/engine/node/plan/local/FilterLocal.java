package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.If;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.List;

public class FilterLocal extends Plan1<Table, Table> {

    public FilterLocal(Plan source, Expression condition) {
        super(source, List.of(condition));
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
        DoubleColumn conditions = expression(0).evaluate();
        int size = Util.toIntSize(table);
        LongArrayList references = new LongArrayList(size);

        for (int i = 0; i < size; i++) {
            if (If.isTrue(conditions.get(i))) {
                references.add(i);
            }
        }

        return LocalTable.indirectOf(table, references);
    }

    public Expression getCondition() {
        return expression(0);
    }
}
