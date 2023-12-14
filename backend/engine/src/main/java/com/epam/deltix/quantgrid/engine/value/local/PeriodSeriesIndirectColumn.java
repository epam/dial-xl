package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import it.unimi.dsi.fastutil.longs.LongArrayList;

public class PeriodSeriesIndirectColumn implements PeriodSeriesColumn {

    private final PeriodSeriesColumn values;
    private final LongArrayList references;

    public PeriodSeriesIndirectColumn(PeriodSeriesColumn values, LongArrayList references) {
        this.values = values;
        this.references = references;
    }

    @Override
    public long size() {
        return references.size();
    }

    @Override
    public PeriodSeries get(long index) {
        long reference = references.getLong(Util.toIntIndex(index));
        return reference < 0 ? null : values.get(reference);
    }
}