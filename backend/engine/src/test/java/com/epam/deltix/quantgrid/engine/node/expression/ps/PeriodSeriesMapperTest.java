package com.epam.deltix.quantgrid.engine.node.expression.ps;

import com.epam.quanthub.scripting.models.functions.Decimal;
import com.epam.quanthub.tslib.TimeSeriesData;
import com.epam.quanthub.tslib.TimeSeriesUtils;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class PeriodSeriesMapperTest {

    @Test
    void testPeriodSeriesWithGaps() {
        TimeSeriesData<Decimal> timeSeries =
                TimeSeriesUtils.newTimeSeriesData(new String[] {"2015", "2017", "2020"}, new Double[] {1d, 2d, 3d});

        Assertions.assertThrowsExactly(IllegalArgumentException.class,
                () -> PeriodSeriesMapper.toPeriodSeries(timeSeries), "Provided time series contain gaps");
    }
}
