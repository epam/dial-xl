package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@NotSemantic
public class Executed extends PlanN<Value, Value> {

    private final Meta meta;
    @Getter
    private final Value result;

    public Executed(@Nullable Plan layout, Meta meta, Value value) {
        super(layout == null ? List.of() : List.of(Plan.sourceOf(layout)));
        this.meta = new Meta(meta.getSchema().asOriginal());
        this.result = value;
    }

    @Override
    protected Plan layout() {
        return (planCount == 0) ? this : plan(0);
    }

    @Override
    protected Meta meta() {
        return meta;
    }

    @Override
    public Value execute(List<Value> args) {
        return result;
    }
}
