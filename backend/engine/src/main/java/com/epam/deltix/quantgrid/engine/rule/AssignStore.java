package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Failed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieverResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimilaritySearchLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.StoreLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;

import java.util.HashSet;
import java.util.Set;

public class AssignStore implements Rule {

    @Override
    public void apply(Graph graph) {
        Set<Plan> toStore = collect(graph);
        replace(graph, toStore);
    }

    private static Set<Plan> collect(Graph graph) {
        Set<Plan> toStore = new HashSet<>();
        Set<Node> visited = new HashSet<>();

        graph.visitOut(node -> {
            if (node instanceof RowNumber number) {
                collect(number.getSource(), visited, toStore);
                return;
            }

            if (node instanceof ViewportLocal viewport) {
                collect(viewport.getSource(), visited, toStore);
            }

            if (node instanceof SimilaritySearchLocal similaritySearch) {
                for (Node child : similaritySearch.getInputs()) {
                    collect(child, visited, toStore);
                }
            }

            if (node instanceof RetrieverResultLocal retrieverResultLocal) {
                for (Node child : retrieverResultLocal.getInputs()) {
                    collect(child, visited, toStore);
                }
            }
        });

        return toStore;
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

    private static void replace(Graph graph, Set<Plan> toStore) {
        graph.transformOut(node -> {
            if (node instanceof Scalar || node instanceof StoreLocal
                    || node instanceof Executed || node instanceof Failed) {
                return node;
            }

            if (node instanceof Plan plan && toStore.contains(plan)) {
                Plan copy = plan.copy(false);
                return new StoreLocal(copy);
            }

            return node;
        });
    }
}
