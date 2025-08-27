package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import org.junit.jupiter.api.Assertions;

public class ViewportVerifier implements Rule {
    @Override
    public void apply(Graph graph) {
        graph.visitOut(node -> {
            if (node instanceof ViewportLocal viewport && viewport.getComputationType() == ComputationType.OPTIONAL) {
                Assertions.fail("There is optional viewport in the graph:\n" + GraphPrinter.toString(graph));
            }
        });
    }
}