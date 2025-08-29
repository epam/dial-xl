package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import org.junit.jupiter.api.Assertions;

import java.util.List;

public class LayoutVerifier implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.visitOut(node -> {
            if (node instanceof Plan plan) {
                if (plan.sources().isEmpty()) {
                    List<Node> inputs = plan.getInputs();
                    Plan layout = inputs.isEmpty() ? null : inputs.get(0).getLayout();
                    int number = 0;

                    for (Node input : inputs) {
                        if (layout != input.getLayout()) {
                            Assertions.fail("Plan: " + plan + "#" + plan.getId()
                                    + " has input: #" + number + " with different layout"
                                    + ". Subgraph: \n" + GraphPrinter.toString(plan));
                        }

                        number++;
                    }
                } else {
                    int number = 0;

                    for (Plan.Source source : plan.sources()) {
                        Plan layout = source.plan().getLayout();

                        for (Expression expression : source.expressions()) {
                            if (layout != expression.getLayout()) {
                                Assertions.fail("Plan: " + plan + "#" + plan.getId()
                                        + " has source: #" + number + " with different layout"
                                        + ". Subgraph: \n" + GraphPrinter.toString(plan));
                            }
                        }

                        number++;
                    }
                }
            }
        });
    }
}
