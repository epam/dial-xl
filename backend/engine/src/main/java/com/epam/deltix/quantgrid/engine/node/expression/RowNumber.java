package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleLambdaColumn;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.apache.spark.sql.Column;

public class RowNumber extends ExpressionWithPlan<Table, DoubleColumn> {

    public RowNumber(Plan source) {
        super(source);
    }

    public Plan getSource() {
        return plan();
    }

    @Override
    public ColumnType getType() {
        return ColumnType.INTEGER;
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    protected DoubleLambdaColumn evaluate(Table layout) {
        return new DoubleLambdaColumn(index -> index, layout.size());
    }

    @Override
    public Column toSpark() {
        throw new IllegalStateException("%s should not be translated to Spark expression".formatted(this));
    }
}
