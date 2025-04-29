package com.epam.deltix.quantgrid.engine.node.plan.local.aggregate;

import java.util.List;
import java.util.stream.LongStream;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import it.unimi.dsi.fastutil.longs.LongArrayList;

public class Lasts implements AggregateFunction {
    @Override
    public long[] aggregate(long rows, List<Column> args) {
        DoubleColumn limits = (DoubleColumn) args.get(0);
        long size = limits.size();
        long limit = size > 0 ? (long) limits.get(0) : 0;

        for (long i = 1; i < size; i++) {
            long actual = (long) limits.get(i);
            Util.verify(limit == actual, "Limits does not match");
        }

        limit = Math.max(0, Math.min(limit, size));
        return LongStream.range(size - limit, size).toArray();
    }

    @Override
    public long[] aggregate(DoubleColumn rows, List<Column> args, int size) {
        DoubleColumn limits = (DoubleColumn) args.get(0);
        LongArrayList refs = new LongArrayList(size);

        for (long ref = rows.size() - 1, prev = size, count = 0, limit = 0; ref >= 0; ref--) {
            int next = (int) rows.get(ref);
            long lim = (long) limits.get(ref);

            if (next >= prev) {
                Util.verify(next == prev, "Keys is decreasing");
                Util.verify(lim == limit, "Limits does not match");
            } else {
                prev = next;
                count = 0;
                limit = lim;
            }

            if (count++ < limit) {
                refs.add(ref);
            }
        }

        for (int i = 0, j = refs.size() - 1; i < j; i++, j--) {
            long a = refs.getLong(i);
            long b = refs.getLong(j);
            refs.set(i, b);
            refs.set(j, a);
        }

        return refs.toLongArray();
    }
}