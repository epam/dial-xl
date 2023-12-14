package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;

import java.util.HashSet;
import java.util.Set;

public class Reduce implements Rule {

    @Override
    public void apply(Graph graph) {
        Set<Node> forbidden = collect(graph);
        replace(graph, forbidden);
    }

    private static Set<Node> collect(Graph graph) {
        Set<Node> forbidden = new HashSet<>();

        graph.visitOut(node -> {
            if (node instanceof Plan plan) {
                for (Node in : plan.getInputs()) {
                    if (in instanceof SelectLocal) {
                        forbidden.add(in);
                    }
                }
            }
        });

        return forbidden;
    }

    private static void replace(Graph graph, Set<Node> forbidden) {
        graph.transformOut(node -> {
            if (node instanceof RowNumber) {
                return new RowNumber(node.getLayout());
            }

            if (node instanceof Expand expand && !forbidden.contains(expand.getSource())) {
                return new Expand(expand.getLayout(), expand.getScalar());
            }

            if (node instanceof Get get && get.plan() instanceof SelectLocal select && !forbidden.contains(select)) {
                return get.getExpression(select);
            }

            if (node instanceof Projection projection && projection.getKey() instanceof RowNumber) {
                return projection.getValue();
            }

            return node;
        });
    }
}