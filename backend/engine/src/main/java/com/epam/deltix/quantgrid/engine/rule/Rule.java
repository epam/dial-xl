package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;

public interface Rule {

    void apply(Graph graph);
}
