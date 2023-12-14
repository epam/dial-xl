package com.epam.deltix.quantgrid.engine.graph;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.PlanN;
import com.epam.deltix.quantgrid.engine.value.Value;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;

class GraphTest {

    @Test
    void addition() {
        Graph graph = new Graph();

        TextNode node1 = new TextNode("1");
        TextNode node2 = new TextNode("2", node1);
        TextNode node3 = new TextNode("3", node1);
        TextNode node4 = new TextNode("4", node2, node3);
        TextNode node5 = new TextNode("5", node2, node3, node4, node2, node3);

        graph.add(node5);
        verify(graph, "1", "2", "3", "4", "5");

        graph.add(node2);
        verify(graph, "1", "2", "3", "4", "5");

        graph.add(node3);
        verify(graph, "1", "2", "3", "4", "5");
    }

    @Test
    void removal() {
        Graph graph = new Graph();

        TextNode node1 = new TextNode("1");
        TextNode node2 = new TextNode("2", node1);
        TextNode node3 = new TextNode("3", node1);
        TextNode node4 = new TextNode("4", node2, node3);
        TextNode node5 = new TextNode("5", node2, node3, node4, node2, node3);

        graph.add(node5);
        verify(graph, "1", "2", "3", "4", "5");

        graph.remove(node5, false);
        verify(graph, "1", "2", "3", "4");

        graph.remove(node4, false);
        verify(graph, "1", "2", "3");
    }

    @Test
    void replacement() {
        Graph graph = new Graph();

        TextNode node1 = new TextNode("1");
        TextNode node2 = new TextNode("2", node1);
        TextNode node3 = new TextNode("3", node1);
        TextNode node4 = new TextNode("4", node2, node3);
        TextNode node5 = new TextNode("5", node2, node3, node4, node2, node3);
        TextNode node6 = new TextNode("6", node1);

        graph.add(node5);
        verify(graph, "1", "2", "3", "4", "5");

        graph.replace(node5, node6, false);
        verify(graph, "1", "2", "3", "6", "4");
    }

    @Test
    void cyclicGraph() {
        Graph graph = new Graph();

        TextNode node1 = new TextNode("1");
        TextNode node2 = new TextNode("2", node1);
        TextNode node3 = new TextNode("3", node2);

        graph.add(node3);
        verify(graph, "1", "2", "3");

        node1.getInputs().add(node3);
        Assertions.assertThrows(IllegalStateException.class, graph::sortOut);
    }

    @Test
    void missingEdge() {
        Graph graph = new Graph();

        TextNode node1 = new TextNode("1");
        TextNode node2 = new TextNode("2", node1);
        TextNode node3 = new TextNode("3", node2);

        graph.add(node3);
        verify(graph, "1", "2", "3");

        node2.getOutputs().clear();
        Assertions.assertThrows(IllegalStateException.class, graph::sortOut);
    }

    private static void verify(Graph graph, String... expected) {
        List<String> output = new ArrayList<>();
        graph.transformOut(node -> {
            output.add(node.toString());
            return node;
        });

        List<String> input = new ArrayList<>();
        graph.visitIn(node -> input.add(node.toString()));

        Collections.reverse(input);
        Assertions.assertArrayEquals(expected, output.toArray(String[]::new));
        Assertions.assertArrayEquals(expected, input.toArray(String[]::new));
    }

    private static class TextNode extends PlanN<Value, Value> {

        private final String text;

        public TextNode(String text, Plan... inputs) {
            super(Arrays.stream(inputs).map(Plan::sourceOf).toArray(Source[]::new));
            this.text = text;
        }

        @Override
        protected Plan layout() {
            return this;
        }

        @Override
        protected Meta meta() {
            return new Meta(Schema.of(ColumnType.STRING));
        }

        @Override
        protected Value execute(List<Value> args) {
            throw new UnsupportedOperationException();
        }

        @Override
        public String toString() {
            return text;
        }
    }
}