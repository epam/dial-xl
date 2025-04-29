package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import lombok.Getter;
import org.apache.spark.sql.functions;

@Getter
public class Constant extends ExpressionWithPlan<Table, Column> {

    private final ColumnType type;
    private final Object constant;

    public Constant(boolean value) {
        this(new Scalar(), value ? 1.0 : 0.0, ColumnType.BOOLEAN);
    }

    public Constant(double number) {
        this(new Scalar(), number);
    }

    public Constant(String text) {
        this(new Scalar(), text);
    }

    public Constant(PeriodSeries series) {
        this(new Scalar(), series);
    }

    public Constant(Plan layout, double number) {
        this(layout, number, ColumnType.closest(number));
    }

    public Constant(Plan layout, String text) {
        this(layout, text, ColumnType.STRING);
    }

    public Constant(Plan layout, PeriodSeries series) {
        this(layout, series, ColumnType.PERIOD_SERIES);
    }

    private Constant(Plan layout, Object constant, ColumnType type) {
        super(layout);
        this.constant = constant;
        this.type = type;
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    protected Column evaluate(Table arg) {
        return switch (type) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> new DoubleDirectColumn((Double) constant);
            case STRING -> new StringDirectColumn((String) constant);
            case PERIOD_SERIES -> new PeriodSeriesDirectColumn((PeriodSeries) constant);
        };
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        Util.verify(type != ColumnType.PERIOD_SERIES);
        return functions.lit(constant);
    }

    @Override
    public String toString() {
        String value = switch (type) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> {
                String result = Doubles.toString((Double) constant);
                yield type.name().toLowerCase() + ": " + result;
            }
            case STRING -> {
                String string = (String) constant;
                String result = Strings.toString(string);
                String quote = Strings.isError(string) ? "" : "\"";
                yield "string: " + quote + result + quote;
              }
            case PERIOD_SERIES -> (constant == null) ? "series: null" : ("\"" + constant + "\"");
        };

        return "Constant(" + value + ")";
    }
}