package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;

public abstract class Expression1<P extends Column, R extends Column> extends Expression {

    protected Expression1(Expression input) {
        super(input);
    }

    @Override
    protected Plan layout() {
        return expression(0).getLayout();
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R evaluate() {
        Util.verify(inputs.size() == 1);
        P arg = expression(0).evaluate();
        return evaluate(arg);
    }

    protected abstract R evaluate(P arg);
}
