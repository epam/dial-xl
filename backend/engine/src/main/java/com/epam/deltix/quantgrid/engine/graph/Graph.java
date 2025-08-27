package com.epam.deltix.quantgrid.engine.graph;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.node.Node;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import lombok.Getter;

import java.util.ArrayList;
import java.util.Collections;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Consumer;
import java.util.function.Function;
import java.util.function.UnaryOperator;

@Getter
public class Graph {

    private final Set<Node> nodes = new LinkedHashSet<>();

    /**
     * Adds all nodes starting from this one to the graph in input direction.
     */
    public void add(Node node) {
        if (nodes.add(node)) {
            for (Node input : node.getInputs()) {
                input.getOutputs().add(node);
                add(input);
            }
        }
    }

    /**
     * Removes all nodes starting from this one from the graph in output direction.
     */
    public void remove(Node node) {
        remove(node, true);
    }

    /**
     * Removes all nodes starting from this one from the graph in output direction.
     */
    public void remove(Node node, boolean deep) {
        Util.verify(node.getOutputs().isEmpty());
        if (nodes.remove(node)) {
            for (Node input : node.getInputs()) {
                input.getOutputs().remove(node);

                if (deep && input.getOutputs().isEmpty()) {
                    remove(input, true);
                }
            }

            node.getInputs().clear();
        }
    }

    /**
     * Replaces an existing node with a new one.
     */
    public void replace(Node original, Node replacement) {
        replace(original, replacement, true);
    }

    /**
     * Replaces an existing node with a new one.
     */
    public void replace(Node original, Node replacement, boolean deepRemove) {
        if (original != replacement) {
            Util.verify(nodes.contains(original));
            add(replacement);

            for (Node output : original.getOutputs()) {
                output.getInputs().replaceAll(input -> input.equals(original) ? replacement : input);
                replacement.getOutputs().add(output);
                output.invalidate();
            }

            replacement.getIdentities().addAll(original.getIdentities());
            replacement.getTraces().addAll(original.getTraces());

            original.getOutputs().clear();
            original.getIdentities().clear();

            remove(original, deepRemove);
        }
    }

    /**
     * Visiting each node in breadth first search fashion in output direction.
     */
    public void visitOut(Consumer<Node> visitor) {
        UnaryOperator<Node> adapter = node -> {
            visitor.accept(node);
            return node;
        };
        transformOut(adapter);
    }

    /**
     * Visiting each node in breadth first search fashion with optional replacement in output direction.
     */
    public void transformOut(UnaryOperator<Node> transformer) {
        List<Node> list = sortOut();
        bfs(list, transformer, true);
    }

    /**
     * Visiting each node in breadth first search fashion in output direction.
     */
    public void visitIn(Consumer<Node> visitor) {
        UnaryOperator<Node> adapter = node -> {
            visitor.accept(node);
            return node;
        };
        transformIn(adapter);
    }

    /**
     * Visiting each node in breadth first search fashion with optional deletion in input direction.
     */
    private void transformIn(UnaryOperator<Node> transformer) {
        List<Node> list = sortIn();
        bfs(list, transformer, false);
    }

    /**
     * Sorts nodes in topological order in output direction.
     */
    public List<Node> sortOut() {
        List<Node> result = new ArrayList<>(nodes.size());
        Object2IntOpenHashMap<Node> counter = new Object2IntOpenHashMap<>(nodes.size());

        for (Node node : nodes) {
            int count = (int) node.getInputs().stream().distinct().count();
            counter.put(node, count);

            if (count == 0) {
                result.add(node);
            }
        }

        for (int i = 0; i < nodes.size(); i++) {
            Util.verify(i < result.size(), "Cycle or missing edge/node");
            Node node = result.get(i);

            for (Node output : node.getOutputs()) {
                int count = counter.addTo(output, -1) - 1;
                Util.verify(count >= 0, "Cycle or missing edge/node");

                if (count == 0) {
                    result.add(output);
                }
            }
        }

        Util.verify(result.size() == nodes.size(), "Cycle or missing edge/node");
        return result;
    }

    /**
     * Sorts nodes in topological order in input direction.
     */
    public List<Node> sortIn() {
        List<Node> sorted = sortOut();
        Collections.reverse(sorted);
        return sorted;
    }

    private void bfs(List<Node> list, Function<Node, Node> visitor, boolean allowReplace) {
        for (Node original : list) {
            boolean invalidated = original.isInvalidated();
            Node replacement = visitor.apply(original);

            if (replacement == null) {
                remove(original);
            } else if (replacement != original) {
                Util.verify(allowReplace, "Replace is prohibited");
                replace(original, replacement);
            } else if (allowReplace && invalidated) {
                original.getOutputs().forEach(Node::invalidate);
            }
        }
    }

    public boolean isEmpty() {
        return nodes.isEmpty();
    }

    public Graph copy() {
        Graph graph = new Graph();
        Map<Node, Node> map = new HashMap<>();

        visitOut(node -> {
            List<Node> ins = node.getInputs().stream().map(map::get).toList();
            Node copy = node.copy(ins);
            graph.add(copy);
            map.put(node, copy);
        });

        return graph;
    }

}