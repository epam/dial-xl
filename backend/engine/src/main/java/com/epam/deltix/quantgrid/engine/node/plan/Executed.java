package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;

import java.util.List;

@NotSemantic
public class Executed extends PlanN<Value, Value> {
    @Getter
    private final Plan original;
    private final Meta meta;
    @Getter
    private final Value result;
    @Getter
    private final long scheduledAt;
    @Getter
    private final long startedAt;
    @Getter
    private final long stoppedAt;

    public Executed(Running running, Value value) {
        super(running.isLayout() ? List.of() : List.of(Plan.sourceOf(running.getLayout())));
        this.original = running.getOriginal();
        this.meta = running.getMeta();
        this.result = value;
        this.scheduledAt = running.getScheduledAt();
        this.startedAt = running.getStartedAt();
        this.stoppedAt = System.currentTimeMillis();
    }

    public Executed(Plan original, Value value) {
        super(original.isLayout() ? List.of() : List.of(Plan.sourceOf(original.getLayout())));
        this.original = NodeUtil.unwrapOriginal(original);
        this.meta = new Meta(original.getMeta().getSchema().asOriginal());
        this.result = value;
        this.scheduledAt = 0;
        this.startedAt = 0;
        this.stoppedAt = 0;
    }

    public Executed(Executed executed, Meta meta, Value value) {
        super(executed.isLayout() ? List.of() : List.of(Plan.sourceOf(executed.getLayout())));
        this.original = executed.getOriginal();
        this.meta = meta;
        this.result = value;
        this.scheduledAt = executed.scheduledAt;
        this.startedAt = executed.startedAt;
        this.stoppedAt = executed.stoppedAt;
    }

    @Override
    protected Plan layout() {
        return (planCount == 0) ? this : plan(0).getLayout();
    }

    @Override
    protected Meta meta() {
        return meta;
    }

    @Override
    public Value execute(List<Value> args) {
        return result;
    }

    @Override
    public String toString() {
        return "Executed(" + original + "#" + original.getId() + ")";
    }
}
