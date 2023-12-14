package com.epam.deltix.quantgrid.engine.node.expression.ps;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.PeriodSeriesFunctions;
import com.epam.deltix.quantgrid.engine.node.plan.spark.util.SparkOperators;
import com.epam.quanthub.scripting.models.data.SimpleTimeSeriesData;
import com.epam.quanthub.scripting.models.functions.Decimal;
import com.epam.quanthub.tslib.Extrapolation;
import org.apache.spark.sql.Column;

public class Extrapolate extends TslibBase {

    public Extrapolate(Expression input) {
        super(input);
    }

    @Override
    protected SimpleTimeSeriesData<Decimal> tsLibFunction(SimpleTimeSeriesData<Decimal> timeSeries) {
        return extrapolate(timeSeries);
    }

    public static SimpleTimeSeriesData<Decimal> extrapolate(SimpleTimeSeriesData<Decimal> timeSeries) {
        return Extrapolation.previousValue(timeSeries).getModeling();
    }

    @Override
    public Column toSpark() {
        Column psColumn = expression(0).toSpark();
        return SparkOperators.periodSeries(PeriodSeriesFunctions.EXTRAPOLATE_FUNCTION_NAME, psColumn);
    }

}
