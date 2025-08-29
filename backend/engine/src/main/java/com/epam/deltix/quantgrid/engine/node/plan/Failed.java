package com.epam.deltix.quantgrid.engine.node.plan;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.NotSemantic;
import com.epam.deltix.quantgrid.engine.value.Value;
import lombok.Getter;
import lombok.SneakyThrows;

import java.util.List;

@NotSemantic
public class Failed extends PlanN<Value, Value> {
    @Getter
    private final Plan original;
    private final Meta meta;
    @Getter
    private final Throwable error;
    @Getter
    private final long scheduledAt;
    @Getter
    private final long startedAt;
    @Getter
    private final long stoppedAt;

    public Failed(Running running, Throwable error) {
        super(running.isLayout() ? List.of() : List.of(Plan.sourceOf(running.getLayout())));
        this.original = running.getOriginal();
        this.meta = running.getMeta();
        this.error = error;
        this.scheduledAt = running.getScheduledAt();
        this.startedAt = running.getStartedAt();
        this.stoppedAt = System.currentTimeMillis();
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
    @SneakyThrows
    public Value execute(List<Value> args) {
        throw error;
    }

    @Override
    public String toString() {
        return "Failed(" + original + "#" + original.getId() + ")";
    }
}
