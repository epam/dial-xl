package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Table;

public class ReuseCached implements Rule {

    private final Cache cache;

    public ReuseCached(Cache cache) {
        this.cache = cache;
    }

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (node instanceof Plan plan) {
                for (Identity id : plan.getIdentities()) {
                    if (RuleUtil.hasSameIdentity(plan, id)) {
                        Table result = cache.load(id);

                        if (result != null) {
                            Meta meta = new Meta(plan.getMeta().getSchema().asOriginal());
                            return new Executed(plan.isLayout() ? null : plan.getLayout(), meta, result);
                        }
                    }
                }
            }

            return node;
        });
    }
}
