package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;

import java.util.List;
import java.util.concurrent.CompletableFuture;

public class Running extends PlanN<Table, Table> {

    @NotSemantic
    private final Meta meta;
    @NotSemantic
    @Getter
    private final CompletableFuture<Value> task;
    @Getter
    private final long originalId;
    @NotSemantic
    private final int layoutIndex;

    public Running(Plan original, CompletableFuture<Value> task, List<Plan> inputs, int layoutIndex) {
        super(inputs.stream().map(Plan::sourceOf).toList());
        this.meta = new Meta(original.getMeta().getSchema().asOriginal());
        this.task = task;
        this.originalId = original.getId();
        this.layoutIndex = layoutIndex;
    }

    @Override
    protected Plan layout() {
        return (layoutIndex < 0) ? this : plan(layoutIndex);
    }

    @Override
    protected Meta meta() {
        return meta;
    }

    @Override
    public Table execute(List<Table> args) {
        throw new IllegalStateException("Can't execute running node");
    }
}
