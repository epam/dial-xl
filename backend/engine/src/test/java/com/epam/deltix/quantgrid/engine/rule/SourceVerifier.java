package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.PythonExpression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.InLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import org.junit.jupiter.api.Assertions;

import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.List;
import java.util.Queue;
import java.util.Set;

public class SourceVerifier implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.visitOut(node -> verify(graph, node));
    }

    private static void verify(Graph graph, Node node) {
        if (!(node instanceof Plan plan) || plan.getPlanCount() == 0 || plan.getExpressionCount() == 0) {
            return;
        }

        for (Plan.Source source : plan.sources()) {
            if (source.plan() instanceof SelectLocal select) {
                Set<Node> visited = new HashSet<>();
                Queue<Node> queue = new ArrayDeque<>();

                for (Expression expression : source.expressions()) {
                    if (visited.add(expression)) {
                        queue.add(expression);
                    }
                }

                while (!queue.isEmpty()) {
                    Node input = queue.remove();
                    if (input == select || input.getLayout() instanceof Scalar) {
                        continue;
                    }

                    if (input instanceof InLocal expression) {
                        List<Node> inputs = expression.getInputs();

                        for (Node in : inputs.subList(0, inputs.size() / 2)) {
                            if (in instanceof Expression && visited.add(in)) {
                                queue.add(in);
                            }
                        }
                    } else if (input instanceof PythonExpression expression) {
                        // it has layout just to return it, will fix it later
                        for (Node in : expression.getInputs()) {
                            if (in instanceof Expression && visited.add(in)) {
                                queue.add(in);
                            }
                        }
                    } else if (input instanceof Projection projection) {
                        Expression in = projection.getKey();

                        if (visited.add(in)) {
                            queue.add(in);
                        }
                    } else if (input instanceof Expression) {
                        for (Node in : input.getInputs()) {
                            if (visited.add(in)) {
                                queue.add(in);
                            }
                        }
                    } else {
                        Assertions.fail("Plan: " + plan + "#" + plan.getId() + " has invalid source. Subgraph: \n"
                                + GraphPrinter.toString(node));
                    }
                }
            }
        }
    }
}
