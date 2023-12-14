package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.value.Column;

public abstract class Expression2<P1 extends Column, P2 extends Column, R extends Column> extends Expression {

    protected Expression2(Expression input1, Expression input2) {
        super(input1, input2);
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R evaluate() {
        Util.verify(inputs.size() == 2);
        P1 arg1 = expression(0).evaluate();
        P2 arg2 = expression(1).evaluate();
        return evaluate(arg1, arg2);
    }

    protected abstract R evaluate(P1 arg, P2 arg2);
}
