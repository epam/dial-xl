package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;
import lombok.Setter;

import java.util.List;
import java.util.concurrent.CompletableFuture;

@Getter
@Setter
@NotSemantic
public class Running extends PlanN<Table, Table> {

    private final Plan original;
    private CompletableFuture<Value> task;
    private final long scheduledAt;
    private long startedAt;

    public Running(List<Plan> inputs, Plan original) {
        super(inputs.stream().map(Plan::sourceOf).toList());
        this.original = original;
        this.scheduledAt = System.currentTimeMillis();
        this.startedAt = scheduledAt;
    }

    @Override
    protected Plan layout() {
        return original.isLayout() ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return new Meta(original.getMeta().getSchema().asOriginal());
    }

    @Override
    public Table execute(List<Table> args) {
        throw new IllegalStateException("Can't execute running node");
    }

    @Override
    public String toString() {
        return "Running(" + original + "#" + original.getId() + ")";
    }
}
