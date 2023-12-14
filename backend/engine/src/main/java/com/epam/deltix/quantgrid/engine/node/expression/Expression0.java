package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.value.Column;

public abstract class Expression0<R extends Column> extends Expression {

    protected Expression0() {
    }

    @Override
    @SuppressWarnings("unchecked")
    public abstract R evaluate();
}
