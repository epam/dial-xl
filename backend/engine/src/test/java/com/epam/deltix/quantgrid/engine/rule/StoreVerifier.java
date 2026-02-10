package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.plan.local.CacheLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.StoreLocal;
import org.junit.jupiter.api.Assertions;

public class StoreVerifier implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.visitOut(node -> {
            if (node instanceof StoreLocal || node instanceof CacheLocal) {
                Assertions.assertFalse(node.getIdentities().isEmpty(),
                        () -> "Store/Cache without identities: " + GraphPrinter.toString(node));
            }
        });
    }
}