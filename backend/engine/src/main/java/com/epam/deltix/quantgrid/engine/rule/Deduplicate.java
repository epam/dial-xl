package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import it.unimi.dsi.fastutil.objects.ObjectOpenCustomHashSet;

public class Deduplicate implements Rule {

    @Override
    public void apply(Graph graph) {
        ObjectOpenCustomHashSet<Node> uniqueSet = new ObjectOpenCustomHashSet<>(DeduplicateStrategy.INSTANCE);
        graph.transformOut(uniqueSet::addOrGet);
    }
}
