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

public class JoinAllLocal extends Plan2<Table, Table, Table> {

    public JoinAllLocal(Plan left, Plan right, List<Expression> leftKeys, List<Expression> rightKeys) {
        super(sourceOf(left, leftKeys), sourceOf(right, rightKeys));
    }

    public List<Expression> getLeftKeys() {
        return expressions(0);
    }

    public List<Expression> getRightKeys() {
        return expressions(1);
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
    protected Table execute(Table leftTable, Table rightTable) {
        List<Expression> leftKeys = expressions(0);
        List<Expression> rightKeys = expressions(1);

        TableIndex rightIndex = TableIndex.build(rightTable, rightKeys, false);
        TableHashStrategy rightStrategy = rightIndex.strategy();
        TableHashStrategy leftStrategy = new TableHashStrategy(leftKeys, rightStrategy);

        int leftSize = Util.toIntSize(leftTable);
        int rightSize = Util.toIntSize(rightTable);
        int expectedSize = Math.max(leftSize, rightSize);

        LongArrayList leftRefs = new LongArrayList(expectedSize);
        LongArrayList rightRefs = new LongArrayList(expectedSize);

        for (int leftRef = 0; leftRef < leftSize; leftRef++) {
            int position = rightIndex.first(leftRef, leftStrategy);

            while (position != TableIndex.MISSING) {
                long rightRef = rightIndex.value(position);
                position = rightIndex.next(position);

                leftRefs.add(leftRef);
                rightRefs.add(rightRef);
            }
        }

        Table leftIndirect = LocalTable.indirectOf(leftTable, leftRefs);
        Table rightIndirect = LocalTable.indirectOf(rightTable, rightRefs);

        return LocalTable.compositeOf(leftIndirect, rightIndirect);
    }
}
