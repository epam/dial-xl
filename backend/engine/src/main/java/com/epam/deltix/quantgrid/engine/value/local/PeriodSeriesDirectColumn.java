package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;

public class PeriodSeriesDirectColumn implements PeriodSeriesColumn {

    private final ObjectArrayList<PeriodSeries> values;

    public PeriodSeriesDirectColumn(PeriodSeries... array) {
        this.values = ObjectArrayList.of(array);
    }

    public PeriodSeriesDirectColumn(ObjectArrayList<PeriodSeries> list) {
        this.values = list;
    }

    @Override
    public long size() {
        return values.size();
    }

    @Override
    public PeriodSeries get(long index) {
        return values.get(Util.toIntIndex(index));
    }
}
