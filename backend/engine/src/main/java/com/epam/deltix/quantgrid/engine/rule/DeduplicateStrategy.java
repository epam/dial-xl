package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.Node;
import it.unimi.dsi.fastutil.Hash;

import java.util.Objects;

class DeduplicateStrategy implements Hash.Strategy<Node> {

    public static final DeduplicateStrategy INSTANCE = new DeduplicateStrategy();

    @Override
    public int hashCode(Node node) {
        return node.semanticId().hashCode();
    }

    @Override
    public boolean equals(Node a, Node b) {
        if (a == b) {
            return true;
        }

        if (a == null || b == null) {
            return false;
        }

        return Objects.equals(a.semanticId(), b.semanticId());
    }
}