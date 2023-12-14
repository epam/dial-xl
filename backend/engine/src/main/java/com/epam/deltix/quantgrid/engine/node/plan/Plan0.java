package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.util.List;

public abstract class Plan0<R extends Value> extends Plan {

    @SafeVarargs
    protected Plan0(List<Expression>... expressions) {
        super(List.of(expressions));
    }

    @Override
    public abstract R execute();

    @SuppressWarnings("unchecked")
    public List<Expression> getExpressions() {
        return (List<Expression>) (Object) inputs;
    }

    public Expression getExpression(int index) {
        return (Expression) inputs.get(index);
    }
}
