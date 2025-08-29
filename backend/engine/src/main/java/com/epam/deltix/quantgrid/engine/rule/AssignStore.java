package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Failed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.CacheLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.StoreLocal;
import com.epam.deltix.quantgrid.engine.store.Store;
import lombok.RequiredArgsConstructor;

import java.util.HashSet;
import java.util.Set;
import java.util.function.Predicate;

@RequiredArgsConstructor
public class AssignStore implements Rule {
    private final Store store;
    private final Predicate<Plan> toStore;

    @Override
    public void apply(Graph graph) {
        Set<Plan> toStore = collect(graph);
        replace(graph, toStore);
    }

    private static Set<Plan> collect(Graph graph) {
        Set<Plan> toCache = new HashSet<>();
        Set<Node> visited = new HashSet<>();

        graph.visitOut(node -> {
            if (node instanceof RowNumber number) {
                collect(number.getSource(), visited, toCache);
                return;
            }

            if (node instanceof ResultPlan) {
                for (Node input : node.getInputs()) {
                    collect(input, visited, toCache);
                }
            }
        });

        return toCache;
    }

    private static void collect(Node node, Set<Node> visited, Set<Plan> toStore) {
        if (!visited.add(node)) {
            return;
        }

        if (node instanceof Expression || node instanceof SelectLocal) {
            for (Node input : node.getInputs()) {
                collect(input, visited, toStore);
            }

            return;
        }

        Plan plan = (Plan) node;
        toStore.add(plan);
        toStore.add(plan.getLayout());
    }

    private void replace(Graph graph, Set<Plan> toCache) {
        graph.transformOut(node -> {
            Plan original = NodeUtil.unwrapOriginal(node);

            if (node instanceof Executed || node instanceof Failed ||
                    original instanceof Scalar || original instanceof CacheLocal || original instanceof StoreLocal) {
                return node;
            }

            if (node instanceof Plan plan && toCache.contains(plan)) {
                Plan copy = plan.copy(false);
                return toStore.test(copy)
                        ? new StoreLocal(copy, store)
                        : new CacheLocal(copy);
            }

            return node;
        });
    }
}
