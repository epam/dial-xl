package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import it.unimi.dsi.fastutil.longs.LongArrayList;

public class StringIndirectColumn implements StringColumn {

    private final StringColumn values;
    private final LongArrayList references;

    public StringIndirectColumn(StringColumn values, LongArrayList references) {
        this.values = values;
        this.references = references;
    }

    @Override
    public long size() {
        return references.size();
    }

    @Override
    public String get(long index) {
        long reference = references.getLong(Util.toIntIndex(index));
        return reference < 0 ? null : values.get(reference);
    }
}