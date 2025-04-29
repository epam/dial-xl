package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.ExpressionN;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableIndex;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;

import java.util.List;

public class InLocal extends ExpressionN<Column, Column> {

    public InLocal(List<Expression> leftKeys, List<Expression> rightKeys) {
        super(Util.combine(leftKeys, rightKeys));
    }

    @Override
    protected Column evaluate(List<Column> args) {
        int keysSize = args.size() / 2;
        Table leftTable = new LocalTable(args.subList(0, keysSize));
        Table rightTable = new LocalTable(args.subList(keysSize, args.size()));

        TableHashStrategy rightStrategy = TableHashStrategy.fromColumns(List.of(rightTable.getColumns()));
        TableHashStrategy leftStrategy = TableHashStrategy.fromColumns(List.of(leftTable.getColumns()), rightStrategy);

        int leftSize = Util.toIntSize(leftTable.size());
        int rightSize = Util.toIntSize(rightTable.size());

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

        return new DoubleDirectColumn(results);
    }

    @Override
    public ColumnType getType() {
        return ColumnType.BOOLEAN;
    }
}
