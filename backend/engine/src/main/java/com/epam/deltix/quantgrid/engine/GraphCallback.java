package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.graph.Graph;

public interface GraphCallback {
    /**
     * Handles graph after optimization. No graph/node modification allowed.
     */
    default void onOptimized(Graph graph) {
    }
}
