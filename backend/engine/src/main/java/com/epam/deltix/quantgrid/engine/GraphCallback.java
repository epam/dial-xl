package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.graph.Graph;

public interface GraphCallback {

    /**
     * Handles graph after compilation. No graph/node modification allowed.
     */
    default void onCompiled(Graph graph) {
    }


    /**
     * Handles graph after normalization. No graph/node modification allowed.
     */
    default void onNormalized(Graph graph) {
    }

    /**
     * Handles graph after optimization. No graph/node modification allowed.
     */
    default void onOptimized(Graph graph) {
    }
}
