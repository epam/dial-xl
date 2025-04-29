package com.epam.deltix.quantgrid.engine.test;

import com.epam.deltix.quantgrid.engine.GraphCallback;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.rule.IdentityVerifier;
import com.epam.deltix.quantgrid.engine.rule.LayoutVerifier;
import com.epam.deltix.quantgrid.engine.rule.Rule;
import com.epam.deltix.quantgrid.engine.rule.ViewportVerifier;

public class PostOptimizationCallback implements GraphCallback {

    private final Rule[] rules;

    public PostOptimizationCallback(Rule... rules) {
        this.rules = rules;
    }

    @Override
    public void onOptimized(Graph graph) {
        for (Rule rule : rules) {
            rule.apply(graph);
        }

        new ViewportVerifier().apply(graph);
        new IdentityVerifier().apply(graph);
        new LayoutVerifier().apply(graph);
        // The current compilation that compiles every argument independently can produce expressions that do not come
        // from Select, but they have the same layout.
        // It could be fixed by EnrichSource rule, but it needs to be updated.
        //new SourceVerifier().apply(graph);
    }
}
