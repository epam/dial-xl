package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import org.junit.jupiter.api.Assertions;

public class ProjectionVerifier implements Rule {

    private boolean enabled = true;

    @Override
    public void apply(Graph graph) {
        if (enabled) {
            graph.visitOut(node -> {
                if (node instanceof Projection) {
                    GraphPrinter.print("Graph with projections", graph);
                    Assertions.fail("Projections in the graph: %s".formatted(node));
                }
            });
        }
    }

    public void enable() {
        this.enabled = true;
    }

    public void disable() {
        this.enabled = false;
    }
}