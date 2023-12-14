package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.LocalTable;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;

public class SimpleGapFillerLocal extends Plan1<Table, Table> {

    private static final DoubleColumn DOUBLE_NA = new DoubleDirectColumn(Double.NaN);
    private static final StringColumn STRING_NA = new StringDirectColumn((String) null);
    private static final PeriodSeriesColumn PERIOD_SERIES_NA = new PeriodSeriesDirectColumn((PeriodSeries) null);

    public SimpleGapFillerLocal(Plan source) {
        super(source);
    }

    @Override
    protected Plan layout() {
        return this;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0));
    }

    @Override
    protected Table execute(Table source) {
        int size = Util.toIntSize(source);

        if (size > 0) {
            return source;
        }

        Schema schema = getPlan().getMeta().getSchema();

        Column[] columns = new Column[schema.size()];
        for (int i = 0; i < schema.size(); i++) {
            columns[i] = switch (schema.getType(i)) {
                case DOUBLE, INTEGER, BOOLEAN, DATE -> DOUBLE_NA;
                case STRING -> STRING_NA;
                case PERIOD_SERIES -> PERIOD_SERIES_NA;
            };
        }

        return new LocalTable(columns);
    }
}
