package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import it.unimi.dsi.fastutil.longs.LongArrayList;

public class DoubleIndirectColumn implements DoubleColumn {

    private final DoubleColumn values;
    private final LongArrayList references;

    public DoubleIndirectColumn(DoubleColumn values, LongArrayList references) {
        this.values = values;
        this.references = references;
    }

    @Override
    public long size() {
        return references.size();
    }

    @Override
    public double get(long index) {
        long reference = references.getLong(Util.toIntIndex(index));
        return reference < 0 ? Double.NaN : values.get(reference);
    }
}