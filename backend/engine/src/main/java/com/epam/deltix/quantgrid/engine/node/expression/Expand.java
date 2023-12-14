package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesLambdaColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;

public class Expand extends ExpressionWithPlan<Table, Column> {

    public Expand(Plan source, Expression scalar) {
        super(source, scalar);
    }

    public Plan getSource() {
        return plan();
    }

    public Expression getScalar() {
        return expression(0);
    }

    @Override
    public ColumnType getType() {
        return expression(0).getType();
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    protected Column evaluate(Table layout) {
        Column column = expression(0).evaluate();
        long size = layout.size();
        return expand(column, size);
    }

    private static Column expand(Column scalar, long size) {
        if (scalar instanceof DoubleColumn column) {
            double constant = column.get(0);
            return new DoubleLambdaColumn(index -> constant, size);
        }

        if (scalar instanceof StringColumn column) {
            String constant = column.get(0);
            return new StringLambdaColumn(index -> constant, size);
        }

        if (scalar instanceof PeriodSeriesColumn column) {
            PeriodSeries constant = column.get(0);
            return new PeriodSeriesLambdaColumn(index -> constant, size);
        }

        throw new UnsupportedOperationException("Not yet supported");
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        return expression(0).toSpark();
    }
}