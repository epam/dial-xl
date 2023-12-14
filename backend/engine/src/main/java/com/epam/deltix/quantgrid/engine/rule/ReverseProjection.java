package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;

import java.util.HashMap;
import java.util.Map;

/**
 * Reverse projections to have only one level projections.
 * Example: [a][b][c]: a -> b -> c => c -> b -> a.
 */
public class ReverseProjection implements Rule {

    @Override
    public void apply(Graph graph) {
        Map<Expression, Expression> replacements = new HashMap<>();
        graph.visitOut(node -> collect(replacements, node));
        graph.transformOut(node -> replace(replacements, node));
    }

    private static void collect(Map<Expression, Expression> replacements, Node node) {
        if (node instanceof Projection projection) {
            Projection sink = projection;

            while (sink.getKey() instanceof Projection source) {
                Projection newSource = new Projection(
                        replacements.getOrDefault(source.getValue(), source.getValue()),
                        replacements.getOrDefault(sink.getValue(), sink.getValue())
                );
                sink = new Projection(source.getKey(), newSource);
            }

            replacements.put(projection, sink);
        }
    }

    private static Node replace(Map<Expression, Expression> replacements, Node node) {
        return (node instanceof Projection projection) ? replacements.get(projection) : node;
    }
}