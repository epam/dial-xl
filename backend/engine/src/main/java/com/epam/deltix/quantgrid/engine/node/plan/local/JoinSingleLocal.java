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

    public List<Expression> getLeftKeys() {
        return expressions(0);
    }

    public List<Expression> getRightKeys() {
        return expressions(1);
    }

    @Override
    protected Plan layout() {
        return getLeft().getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 1));
    }

    @Override
    protected Table execute(Table leftTable, Table rightTable) {
        List<Expression> leftKeys = getLeftKeys();
        List<Expression> rightKeys = getRightKeys();

        TableHashStrategy rightStrategy = new TableHashStrategy(rightKeys);
        TableHashStrategy leftStrategy = new TableHashStrategy(leftKeys, rightStrategy);

        int leftSize = Util.toIntSize(leftTable.size());
        int rightSize = Util.toIntSize(rightTable.size());

        LongArrayList leftRefs = new LongArrayList(leftSize);
        LongArrayList rightRefs = new LongArrayList(leftSize);

        if (leftSize == 1) {
            filterJoin(leftStrategy, rightSize, leftRefs, rightRefs);
        } else {
            TableIndex index = TableIndex.build(rightSize, rightStrategy, false);
            hashJoin(leftStrategy, index, leftSize, leftRefs, rightRefs);
        }

        return LocalTable.indirectOf(rightTable, rightRefs);
    }

    private static void hashJoin(TableHashStrategy strategy, TableIndex index, int size,
                                 LongArrayList lefts, LongArrayList rights) {
        for (int leftRef = 0; leftRef < size; leftRef++) {
            int position = index.first(leftRef, strategy);

            // if position present - add index, otherwise - skip
            if (position != TableIndex.MISSING) {
                long rightRef = index.value(position);

                lefts.add(leftRef);
                rights.add(rightRef);

                // verify that we have only one position for the given key
                Util.verify(index.next(position) == TableIndex.MISSING);
            } else {
                lefts.add(leftRef);
                rights.add(TableIndex.MISSING);
            }
        }
    }

    private static void filterJoin(TableHashStrategy strategy, long size,
                                   LongArrayList lefts, LongArrayList rights) {
        long ref = Util.NA_REF;

        if (!strategy.hasError(0)) {
            for (long rightRef = 0; rightRef < size; rightRef++) {
                if (strategy.equals(0, rightRef)) {
                    // verify that we have only one position for the given key
                    Util.verify(ref == Util.NA_REF, "Table contains non unique keys");
                    ref = rightRef;
                }
            }
        }

        lefts.add(0);
        rights.add(ref);
    }
}
