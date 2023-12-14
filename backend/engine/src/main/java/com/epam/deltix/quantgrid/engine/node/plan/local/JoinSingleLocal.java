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
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.List;

public class JoinSingleLocal extends Plan2<Table, Table, Table> {

    public JoinSingleLocal(Plan left, Plan right, List<Expression> leftKeys, List<Expression> rightKeys) {
        super(sourceOf(left, leftKeys), sourceOf(right, rightKeys));
    }

    @Override
    protected Plan layout() {
        return getLeft().getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0, 1));
    }

    @Override
    protected Table execute(Table leftTable, Table rightTable) {
        List<Expression> leftKeys = expressions(0);
        List<Expression> rightKeys = expressions(1);

        TableIndex rightIndex = TableIndex.build(rightTable, rightKeys);
        TableHashStrategy rightStrategy = rightIndex.strategy();
        TableHashStrategy leftStrategy = new TableHashStrategy(leftKeys, rightStrategy);

        int leftSize = Util.toIntSize(leftTable.size());
        LongArrayList leftRefs = new LongArrayList(leftSize);
        LongArrayList rightRefs = new LongArrayList(leftSize);

        for (int leftRef = 0; leftRef < leftSize; leftRef++) {
            int position = rightIndex.first(leftRef, leftStrategy);

            // if position present - add index, otherwise - skip
            if (position != TableIndex.MISSING) {
                long rightRef = rightIndex.value(position);

                leftRefs.add(leftRef);
                rightRefs.add(rightRef);

                // verify that we have only one position for the given key
                Util.verify(rightIndex.next(position) == TableIndex.MISSING);
            } else {
                leftRefs.add(leftRef);
                rightRefs.add(TableIndex.MISSING);
            }
        }

        Table leftIndirect = LocalTable.indirectOf(leftTable, leftRefs);
        Table rightIndirect = LocalTable.indirectOf(rightTable, rightRefs);

        return LocalTable.compositeOf(leftIndirect, rightIndirect);
    }
}
