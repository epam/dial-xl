package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.longs.LongOpenCustomHashSet;

import java.util.List;

public class DistinctByLocal extends Plan1<Table, Table> {

    public DistinctByLocal(Plan source, List<Expression> keys) {
        super(source, keys);
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
        LongArrayList references = new LongArrayList(size);

        List<Expression> keys = expressions(0);
        TableHashStrategy strategy = new TableHashStrategy(keys, true, false);
        LongOpenCustomHashSet set = new LongOpenCustomHashSet(size, strategy);

        for (int i = 0; i < size; i++) {
            if (set.add(i)) {
                references.add(i);
            }
        }

        return LocalTable.indirectOf(table, references);
    }
}
