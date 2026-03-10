package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableIndex;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;

import java.util.List;

public class InLocal extends Plan2<Table, Table, Table> {

    public InLocal(Plan left, List<Expression> leftKeys, Plan right, List<Expression> rightKeys) {
        super(sourceOf(left, leftKeys), sourceOf(right, rightKeys));
    }

    @Override
    protected Plan layout() {
        return getLeft().getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.of(ColumnType.DOUBLE));
    }

    @Override
    protected Table execute(Table left, Table right) {
        List<Expression> leftKeys = expressions(0);
        List<Expression> rightKeys = expressions(1);

        TableHashStrategy rightStrategy = new TableHashStrategy(rightKeys);
        TableHashStrategy leftStrategy = new TableHashStrategy(leftKeys, rightStrategy);

        int leftSize = Util.toIntSize(left.size());
        int rightSize = Util.toIntSize(right.size());

        DoubleArrayList results = new DoubleArrayList(leftSize);

        TableIndex index = TableIndex.build(rightSize, rightStrategy, false);
        for (int leftRef = 0; leftRef < leftSize; leftRef++) {
            int position = index.first(leftRef, leftStrategy);

            if (position != TableIndex.MISSING) {
                results.add(1);
            } else {
                results.add(0);
            }
        }

        return new LocalTable(new DoubleDirectColumn(results));
    }
}
