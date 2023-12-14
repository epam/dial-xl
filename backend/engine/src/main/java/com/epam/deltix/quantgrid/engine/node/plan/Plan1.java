package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.util.List;

public abstract class Plan1<P extends Value, R extends Value> extends Plan {

    protected Plan1(Plan source) {
        super(sourceOf(source));
    }

    protected Plan1(Plan source, List<Expression> keys) {
        super(sourceOf(source, keys));
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R execute() {
        P arg = (P) plan(0).execute();
        return execute(arg);
    }

    protected abstract R execute(P arg);

    public Plan getPlan() {
        return plan(0);
    }
}
