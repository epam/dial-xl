package com.epam.deltix.quantgrid.engine.node.expression.ps;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Expression1;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.quanthub.scripting.models.data.SimpleTimeSeriesData;
import com.epam.quanthub.scripting.models.functions.Decimal;
import com.epam.quanthub.tslib.TimeSeriesData;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public abstract class TslibBase extends Expression1<PeriodSeriesColumn, PeriodSeriesColumn> {

    protected TslibBase(Expression input) {
        super(input);
    }

    @Override
    public final ColumnType getType() {
        return ColumnType.PERIOD_SERIES;
    }

    @Override
    protected final PeriodSeriesColumn evaluate(PeriodSeriesColumn psColumn) {
        int size = Util.toIntSize(psColumn.size());
        PeriodSeries[] result = new PeriodSeries[size];
        for (int i = 0; i < size; i++) {
            PeriodSeries periodSeries = psColumn.get(i);
            if (periodSeries == null) {
                // keep null
            } else if (PeriodSeriesMapper.isEmpty(periodSeries)) {
                result[i] = periodSeries;
            } else {
                try {
                    TimeSeriesData<Decimal> timeSeriesData = PeriodSeriesMapper.toTimeSeriesData(periodSeries);
                    SimpleTimeSeriesData<Decimal> modeling = tsLibFunction(timeSeriesData);
                    result[i] = PeriodSeriesMapper.toPeriodSeries(modeling);
                } catch (Exception e) {
                    log.error("Failed to process period series: %s".formatted(e.getMessage()), e);
                }
            }
        }

        return new PeriodSeriesDirectColumn(result);
    }

    protected abstract SimpleTimeSeriesData<Decimal> tsLibFunction(SimpleTimeSeriesData<Decimal> timeSeries);
}
