package com.epam.deltix.quantgrid.engine.node.plan.local;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan1;
import com.epam.deltix.quantgrid.engine.value.Value;

@NotSemantic
public class CacheLocal extends Plan1<Value, Value> {

    public CacheLocal(Plan source) {
        super(source);
    }

    @Override
    protected Plan layout() {
        Plan source = plan(0);
        Plan layout = source.getLayout();
        return (source == layout) ? this : layout;
    }

    @Override
    protected Meta meta() {
        return new Meta(Schema.inputs(this, 0));
    }

    @Override
    protected Value execute(Value source) {
        return source;
    }
}