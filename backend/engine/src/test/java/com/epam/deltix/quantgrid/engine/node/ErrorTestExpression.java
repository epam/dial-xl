package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.engine.node.expression.ExpressionWithPlan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.type.ColumnType;

@NotSemantic
class ErrorTestExpression extends ExpressionWithPlan<Value, Column> {

    private final RuntimeException exception;

    ErrorTestExpression(Plan layout, RuntimeException exception) {
        super(layout);
        this.exception = exception;
    }

    @Override
    public ColumnType getType() {
        return ColumnType.DOUBLE;
    }

    @Override
    protected Plan layout() {
        return plan().getLayout();
    }

    @Override
    public Column evaluate(Value layout) {
        throw exception;
    }

    @Override
    public org.apache.spark.sql.Column toSpark() {
        throw new IllegalStateException("%s cannot be translated to Spark expression, it's a test error."
                .formatted(this));
    }
}
