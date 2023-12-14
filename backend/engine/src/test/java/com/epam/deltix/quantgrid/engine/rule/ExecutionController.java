package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.plan.ControllablePlan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import lombok.Getter;
import org.jetbrains.annotations.Nullable;

import java.util.HashSet;
import java.util.Set;

public class ExecutionController implements Rule {

    @Nullable
    private final Set<Plan> originals;

    @Nullable
    private final Class<? extends Plan> clazz;

    @Getter
    private final Set<ControllablePlan> controllablePlans = new HashSet<>();

    public ExecutionController(Class<? extends Plan> clazz) {
        this(clazz, null);
    }

    private ExecutionController(@Nullable Class<? extends Plan> clazz, @Nullable Set<Plan> originals) {
        this.clazz = clazz;
        this.originals = originals;
    }

    @Override
    public void apply(Graph graph) {
        if (clazz != null) {
            graph.transformOut(node -> {
                if (node instanceof Plan plan && clazz.isInstance(plan)) {
                    return wrapPlan(plan);
                }
                return node;
            });
        } else {
            Util.verify(originals != null);
            graph.transformOut(node -> {
                if (node instanceof Plan plan && originals.contains(plan)) {
                    return wrapPlan(plan);
                }
                return node;
            });
        }
    }

    public void await() {
        controllablePlans.forEach(ControllablePlan::await);
    }

    public void release() {
        controllablePlans.forEach(ControllablePlan::release);
    }

    private ControllablePlan wrapPlan(Plan plan) {
        Plan copy = plan.copy(false);
        ControllablePlan controllablePlan = new ControllablePlan(copy);
        controllablePlans.add(controllablePlan);
        return controllablePlan;
    }
}
