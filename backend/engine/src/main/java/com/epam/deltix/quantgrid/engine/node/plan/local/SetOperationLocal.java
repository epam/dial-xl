package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan2;
import com.epam.deltix.quantgrid.engine.node.plan.local.util.TableHashStrategy;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.ints.IntIntPair;
import it.unimi.dsi.fastutil.longs.AbstractLongSet;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.longs.LongOpenCustomHashSet;

import java.util.List;

public class SetOperationLocal extends Plan2<Table, Table, Table> {
    private static final IntIntPair NORMAL_SOURCE_ORDER = IntIntPair.of(0, 1);
    private static final IntIntPair REVERSE_SOURCE_ORDER = IntIntPair.of(1, 0);
    private final SetOperation operation;

    public SetOperationLocal(
            Plan leftTable,
            Expression leftValues,
            Plan rightTable,
            Expression rightValues,
            SetOperation operation) {
        super(sourceOf(leftTable, leftValues), sourceOf(rightTable, rightValues));
        this.operation = operation;
    }

    public SetOperationLocal(
            Plan leftTable,
            Expression leftKeys,
            Expression leftValues,
            Plan rightTable,
            Expression rightKeys,
            Expression rightValues,
            SetOperation operation) {
        super(sourceOf(leftTable, leftKeys, leftValues), sourceOf(rightTable, rightKeys, rightValues));
        this.operation = operation;
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return isNested()
                ? new Meta(Schema.of(ColumnType.DOUBLE, expression(0, 1).getType()))
                : new Meta(Schema.of(expression(0, 0).getType()));
    }

    @Override
    public Table execute(Table ignored1, Table ignored2) {
        IntIntPair sourceIndices = operation.swapArguments() ? REVERSE_SOURCE_ORDER : NORMAL_SOURCE_ORDER;
        if (isNested()) {
            Column leftValues = expression(sourceIndices.firstInt(), 1).evaluate();
            Column rightValues = expression(sourceIndices.secondInt(), 1).evaluate();
            DoubleColumn leftKeys = expression(sourceIndices.firstInt(), 0).evaluate();
            DoubleColumn rightKeys = expression(sourceIndices.secondInt(), 0).evaluate();
            return performSetOperation(
                    leftKeys,
                    rightKeys,
                    new LocalTable(
                            Util.concat(leftKeys, rightKeys),
                            Util.concat(leftValues, rightValues)));
        }

        Column leftValues = expression(sourceIndices.firstInt(), 0).evaluate();
        Column rightValues = expression(sourceIndices.secondInt(), 0).evaluate();
        DoubleColumn leftKeys = new DoubleLambdaColumn(i -> 0, leftValues.size());
        DoubleColumn rightKeys = new DoubleLambdaColumn(i -> 0, rightValues.size());
        return performSetOperation(
                leftKeys,
                rightKeys,
                new LocalTable(Util.concat(leftValues, rightValues)));
    }

    private Table performSetOperation(
            DoubleColumn leftKeys, DoubleColumn rightKeys, Table source) {
        TableHashStrategy hashStrategy = TableHashStrategy.fromColumns(
                List.of(source.getColumn(source.getColumnCount() - 1)));
        AbstractLongSet uniqueValues = new LongOpenCustomHashSet(hashStrategy);
        LongArrayList refs = new LongArrayList();

        long leftIndex = 0, rightIndex = 0;
        long leftSize = leftKeys.size();
        long rightSize = rightKeys.size();
        while (leftIndex < leftSize || rightIndex < rightSize) {
            double nextKey;
            if (leftIndex < leftSize && rightIndex < rightSize) {
                nextKey = Math.min(leftKeys.get(leftIndex), rightKeys.get(rightIndex));
            } else if (leftIndex < leftSize) {
                nextKey = leftKeys.get(leftIndex);
            } else {
                nextKey = rightKeys.get(rightIndex);
            }

            uniqueValues.clear();

            while (leftIndex < leftSize && leftKeys.get(leftIndex) == nextKey) {
                operation.onLeft().update(refs, leftIndex, uniqueValues.add(leftIndex));
                ++leftIndex;
            }

            while (rightIndex < rightSize && rightKeys.get(rightIndex) == nextKey) {
                long fullIndex = rightIndex + leftSize;
                operation.onRight().update(refs, fullIndex, uniqueValues.add(fullIndex));
                ++rightIndex;
            }
        }

        return LocalTable.indirectOf(source, refs);
    }

    private boolean isNested() {
        return expressionCount(0) == 2;
    }
}
