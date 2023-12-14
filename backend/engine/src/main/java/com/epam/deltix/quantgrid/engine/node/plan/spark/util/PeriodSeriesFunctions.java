package com.epam.deltix.quantgrid.engine.node.plan.spark.util;

import com.epam.deltix.quantgrid.engine.node.expression.ps.Extrapolate;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PercentChange;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PeriodSeriesMapper;
import com.epam.deltix.quantgrid.engine.spark.ScalaUtil;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.quanthub.scripting.models.data.SimpleTimeSeriesData;
import com.epam.quanthub.scripting.models.functions.Decimal;
import org.apache.spark.sql.catalyst.InternalRow;
import org.apache.spark.sql.catalyst.expressions.UnsafeArrayData;
import org.apache.spark.unsafe.types.UTF8String;

import java.io.Serializable;
import java.util.HashMap;
import java.util.Map;
import java.util.function.UnaryOperator;

public class PeriodSeriesFunctions implements Serializable {

    public static final String EXTRAPOLATE_FUNCTION_NAME = "extrapolate";
    public static final String PERCENT_CHANGE_FUNCTION_NAME = "percentChange";

    private static final UnsafeArrayData EMPTY_VALUES = UnsafeArrayData.fromPrimitiveArray(new double[0]);

    private static final Map<Period, UTF8String> periods = new HashMap<>();

    static {
        for (Period period : Period.values()) {
            periods.put(period, UTF8String.fromString(period.name()));
        }
    }

    public static InternalRow extrapolate(InternalRow row) {
        return psFunction(row, Extrapolate::extrapolate);
    }

    public static InternalRow percentChange(InternalRow row) {
        return psFunction(row, PercentChange::percentChange);
    }

    private static InternalRow psFunction(InternalRow row, UnaryOperator<SimpleTimeSeriesData<Decimal>> function) {
        PeriodSeries periodSeries = toPeriodSeries(row);

        if (PeriodSeriesMapper.isEmpty(periodSeries)) {
            return emptyPeriodSeriesRow(periodSeries.getPeriod());
        }

        SimpleTimeSeriesData<Decimal> timeSeriesData = PeriodSeriesMapper.toTimeSeriesData(periodSeries);
        SimpleTimeSeriesData<Decimal> result = function.apply(timeSeriesData);
        PeriodSeries resultPeriodSeries = PeriodSeriesMapper.toPeriodSeries(result);

        return toPeriodSeriesRow(resultPeriodSeries);
    }

    private static InternalRow emptyPeriodSeriesRow(Period period) {
        return InternalRow.fromSeq(ScalaUtil.seq(Double.NaN, periods.get(period), EMPTY_VALUES));
    }

    private static InternalRow toPeriodSeriesRow(PeriodSeries ps) {
        double offset = ps.getOffset();
        UTF8String period = periods.get(ps.getPeriod());
        UnsafeArrayData values = UnsafeArrayData.fromPrimitiveArray(ps.getValues().toArray());

        // Spark Invoke with reusable UnsafeRow potentially can be more performant
        // We can revisit approach later
        return InternalRow.fromSeq(ScalaUtil.seq(offset, period, values));
    }

    private static PeriodSeries toPeriodSeries(InternalRow row) {
        double offset = row.getDouble(0);
        String period = row.getString(1);
        double[] values = row.getArray(2).toDoubleArray();

        return new PeriodSeries(Period.valueOf(period), offset, values);
    }
}
