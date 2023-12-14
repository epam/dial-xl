package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;
import lombok.SneakyThrows;
import org.jetbrains.annotations.Nullable;

import java.util.List;

@NotSemantic
public class Failed extends PlanN<Value, Value> {

    private final Meta meta;
    @Getter
    private final Throwable error;

    public Failed(@Nullable Plan layout, Meta meta, Throwable error) {
        super(layout == null ? List.of() : List.of(Plan.sourceOf(layout)));
        this.meta = meta;
        this.error = error;
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
    @SneakyThrows
    public Value execute(List<Value> args) {
        throw error;
    }
}
