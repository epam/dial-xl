package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.value.Value;

public abstract class Plan3<P1 extends Value, P2 extends Value, P3 extends Value, R extends Value> extends Plan {

    protected Plan3(Source source1, Source source2, Source source3) {
        super(source1, source2, source3);
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R execute() {
        P1 arg1 = (P1) plan(0).execute();
        P2 arg2 = (P2) plan(1).execute();
        P3 arg3 = (P3) plan(2).execute();
        return execute(arg1, arg2, arg3);
    }

    protected abstract R execute(P1 arg1, P2 arg2, P3 arg3);
}
