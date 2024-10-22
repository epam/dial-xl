package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieverResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimilaritySearchLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;

import java.util.stream.IntStream;

public class AssignIdentity implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.visitOut(node -> {
            if (node instanceof SelectLocal || node instanceof ViewportLocal || node instanceof SimilaritySearchLocal ||
                node instanceof RetrieverResultLocal) {
                return;
            }

            String id = node.semanticId();
            int size =  (node instanceof Plan plan) ?  plan.getMeta().getSchema().size() : 1;
            int[] mapping = IntStream.range(0, size).toArray();
            Identity identity = new Identity(id, true, mapping);
            node.getIdentities().add(identity);
        });
    }
}