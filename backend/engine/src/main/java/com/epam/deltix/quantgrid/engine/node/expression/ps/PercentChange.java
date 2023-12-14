package com.epam.deltix.quantgrid.engine.node.expression.ps;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.PeriodSeriesFunctions;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.SparkOperators;
import com.epam.quanthub.scripting.models.data.SimpleTimeSeriesData;
import com.epam.quanthub.scripting.models.functions.Decimal;
import com.epam.quanthub.tslib.TimeSeriesUtils;
import org.apache.spark.sql.Column;

public class PercentChange extends TslibBase {

    public PercentChange(Expression input) {
        super(input);
    }

    @Override
    protected SimpleTimeSeriesData<Decimal> tsLibFunction(SimpleTimeSeriesData<Decimal> timeSeries) {
        return percentChange(timeSeries);
    }

    public static SimpleTimeSeriesData<Decimal> percentChange(SimpleTimeSeriesData<Decimal> timeSeries) {
        return TimeSeriesUtils.pch(timeSeries);
    }

    @Override
    public Column toSpark() {
        Column psColumn = expression(0).toSpark();
        return SparkOperators.periodSeries(PeriodSeriesFunctions.PERCENT_CHANGE_FUNCTION_NAME, psColumn);
    }
}
