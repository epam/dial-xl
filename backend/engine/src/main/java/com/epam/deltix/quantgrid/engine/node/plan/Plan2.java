package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.value.Value;

public abstract class Plan2<P1 extends Value, P2 extends Value, R extends Value> extends Plan {

    protected Plan2(Source source1, Source source2) {
        super(source1, source2);
    }

    protected Plan2(Plan source1, Plan source2) {
        super(sourceOf(source1), sourceOf(source2));
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R execute() {
        P1 arg1 = (P1) plan(0).execute();
        P2 arg2 = (P2) plan(1).execute();
        return execute(arg1, arg2);
    }

    protected abstract R execute(P1 arg1, P2 arg2);

    public Plan getLeft() {
        return plan(0);
    }

    public Plan getRight() {
        return plan(1);
    }
}
