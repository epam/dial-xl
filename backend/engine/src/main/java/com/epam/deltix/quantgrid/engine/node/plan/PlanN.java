package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.util.ArrayList;
import java.util.List;

@NotSemantic
public abstract class PlanN<P extends Value, R extends Value> extends Plan {

    protected PlanN(Source... sources) {
        super(sources);
    }

    protected PlanN(List<Source> sources) {
        this(sources.toArray(Source[]::new));
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R execute() {
        List<P> values = new ArrayList<>(planCount);

        for (int i = 0; i < planCount; i++) {
            P value = (P) plan(i).execute();
            values.add(value);
        }

        return execute(values);
    }

    protected abstract R execute(List<P> args);
}
