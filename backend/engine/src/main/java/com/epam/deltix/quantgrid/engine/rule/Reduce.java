package com.epam.deltix.quantgrid.engine.rule;

import java.util.HashSet;
import java.util.Set;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.PythonExpression;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import lombok.RequiredArgsConstructor;

@RequiredArgsConstructor
public class Reduce implements Rule {

    private final boolean deep;

    @Override
    public void apply(Graph graph) {
        Set<Node> forbidden = deep ? Set.of() : collect(graph);
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
            if (node instanceof Expand expand && expand.getLayout() instanceof Scalar) {
                return expand.getScalar();
            }

            if (node instanceof Projection projection && projection.getKey() instanceof RowNumber) {
                return projection.getValue();
            }

            if (node instanceof Get get && get.plan() instanceof SelectLocal select && !forbidden.contains(select)) {
                return get.getExpression(select);
            }

            if (node instanceof RowNumber number && !forbidden.contains(number.plan())) {
                return new RowNumber(number.getLayout());
            }

            if (node instanceof Expand expand && !forbidden.contains(expand.plan())) {
                return new Expand(expand.getLayout(), expand.getScalar());
            }

            if (node instanceof PythonExpression python && !forbidden.contains(python.plan())) {
                return new PythonExpression(python.getLayout(), python.expressions(),
                        python.getCode(), python.getName(), python.getType());
            }

            if (node instanceof AggregateLocal aggregate) {
                return new AggregateLocal(aggregate.getType(), aggregate.getInputLayout().getLayout(),
                        aggregate.getSource(), aggregate.getKey(), aggregate.getValues());
            }

            return node;
        });
    }
}