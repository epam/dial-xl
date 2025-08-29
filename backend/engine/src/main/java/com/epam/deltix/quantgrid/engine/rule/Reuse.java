package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Failed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.LoadLocal;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.extern.slf4j.Slf4j;

import java.util.List;
import java.util.function.Predicate;

@Slf4j
public class Reuse implements Rule {

    private final Cache cache;
    private final Store store;
    private final Predicate<Plan> toStore;

    public Reuse(Cache cache, Store store, Predicate<Plan> toStore) {
        this.cache = cache;
        this.store = store;
        this.toStore = toStore;
    }

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (node instanceof Plan plan && !(plan instanceof Executed || plan instanceof Failed)) {
                for (Identity id : plan.getIdentities()) {
                    if (RuleUtil.hasSameIdentity(plan, id)) {
                        Table result = cache.load(id);

                        if (result != null) {
                            return new Executed(plan, result);
                        }

                        Plan original = NodeUtil.unwrapOriginal(plan);
                        if (original instanceof LoadLocal) {
                            return plan;
                        }

                        if (toStore.test(original) && store.lock(id)) {
                            List<Identity> identities = List.of(id);
                            List<Meta> meta = List.of(new Meta(plan.getMeta().getSchema().asOriginal()));
                            return new LoadLocal(store, original, identities, meta);
                        }
                    }
                }
            }
            return node;
        });
    }
}
