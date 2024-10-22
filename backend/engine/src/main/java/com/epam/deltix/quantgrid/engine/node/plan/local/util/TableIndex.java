package com.epam.deltix.quantgrid.engine.node.plan.local.util;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.value.Table;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.longs.Long2IntMaps;
import it.unimi.dsi.fastutil.longs.Long2IntOpenCustomHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;

import java.util.List;


public final class TableIndex extends Long2IntOpenCustomHashMap {

    public static final int MISSING = -1;

    private IntArrayList appendLink;
    private LongArrayList appendList;
    private int[] lookupLink;
    private long[] lookupList;

    private TableIndex(int expected, TableHashStrategy strategy) {
        super(expected, strategy);
        appendLink = new IntArrayList(expected);
        appendList = new LongArrayList(expected);
        defaultReturnValue(MISSING);
    }

    public TableHashStrategy strategy() {
        return (TableHashStrategy) strategy;
    }

    /**
     * Finds the index of the first matching row using table hash strategy.
     * The strategy must be created with the same data table as this index was built for.
     * The strategy can be created with the same search table or a different one.
     */
    public int first(long row, TableHashStrategy strategy) {
        if (size == 0) {
            return defRetValue;
        }

        if ((strategy.equals((row), (0)))) {
            return containsNullKey ? value[n] : defRetValue;
        }
        long curr;
        final long[] key = this.key;
        int pos;
        // The starting point.
        if (((curr = key[pos = (it.unimi.dsi.fastutil.HashCommon.mix(strategy.hashCode(row))) & mask]) == (0))) {
            return defRetValue;
        }
        if ((strategy.equals((row), (curr)))) {
            return value[pos];
        }
        // There's always an unused entry.
        while (true) {
            if (((curr = key[pos = (pos + 1) & mask]) == (0))) {
                return defRetValue;
            }
            if ((strategy.equals((row), (curr)))) {
                return value[pos];
            }
        }
    }

    /**
     * Takes the index of the last matching row and returns the index of the next matching row.
     */
    public int next(int index) {
        return lookupLink[index];
    }

    /**
     * Return the row reference of matching row by index.
     */
    public long value(int index) {
        return lookupList[index];
    }

    private void add(long row) {
        int next = appendList.size();
        int prev = put(row, next);

        appendList.add(row);
        appendLink.add(prev);
    }

    private void optimize() {
        long[] list = new long[appendList.size()];
        int[] link = new int[appendLink.size()];
        int next = list.length - 1;

        for (Entry entry : Long2IntMaps.fastIterable(this)) {
            int index = entry.getIntValue();
            int prev = MISSING;

            // reverses append list and optimizes locality
            do {
                list[next] = appendList.getLong(index);
                link[next] = prev;

                prev = next--;
                index = appendLink.getInt(index);
            } while (index != MISSING);

            entry.setValue(prev);
        }

        this.lookupList = list;
        this.lookupLink = link;
        this.appendList = null;
        this.appendLink = null;
    }

    public static TableIndex build(Table table, List<Expression> keys, boolean matchErrors, boolean matchEmptyWithZero) {
        TableHashStrategy strategy = new TableHashStrategy(keys, matchErrors, matchEmptyWithZero);
        int size = Util.toIntSize(table.size());
        return build(size, strategy);
    }

    public static TableIndex build(int size, TableHashStrategy strategy) {
        TableIndex index = new TableIndex(size, strategy);
        for (int i = 0; i < size; i++) {
            index.add(i);
        }

        index.optimize();
        return index;
    }
}
