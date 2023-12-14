package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;

public class Clean implements Rule {

    private final boolean cleanOptionalViewports;

    public Clean() {
        this(false);
    }

    public Clean(boolean cleanOptionalViewports) {
        this.cleanOptionalViewports = cleanOptionalViewports;
    }

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> isDead(node) ? null : node);
    }

    private boolean isDead(Node node) {
        if (!node.getOutputs().isEmpty()) {
            return false;
        }

        if (node instanceof ViewportLocal viewport) {
            return cleanOptionalViewports && viewport.isOptional();
        }

        return true;
    }
}
