package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;

public abstract class Expression3<P1 extends Column, P2 extends Column, P3 extends Column, R extends Column>
        extends Expression {

    protected Expression3(Expression input1, Expression input2, Expression input3) {
        super(input1, input2, input3);
    }

    @Override
    protected Plan layout() {
        return expression(0).getLayout();
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R evaluate() {
        Util.verify(inputs.size() == 3);
        P1 arg1 = expression(0).evaluate();
        P2 arg2 = expression(1).evaluate();
        P3 arg3 = expression(2).evaluate();
        return evaluate(arg1, arg2, arg3);
    }

    protected abstract R evaluate(P1 arg, P2 arg2, P3 arg3);
}
