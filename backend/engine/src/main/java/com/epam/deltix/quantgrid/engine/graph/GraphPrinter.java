package com.epam.deltix.quantgrid.engine.graph;

import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.util.ColorUtil;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import lombok.experimental.UtilityClass;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayDeque;
import java.util.Arrays;
import java.util.Deque;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.stream.Collectors;
import java.util.stream.IntStream;

@Slf4j
@UtilityClass
public class GraphPrinter {

    public void print(Graph graph) {
        log.trace("\n{}", GraphPrinter.toString(graph));
    }

    public void print(String message, Graph graph) {
        log.trace("{}\n{}", message, GraphPrinter.toString(graph));
    }

    private static void nodeToString(Object2IntMap<Plan> colours, StringBuilder sb, Node node) {
        Plan layout = node.getLayout();
        int colour = colours.computeIfAbsent(layout, (Plan key) -> ColorUtil.generateUniqueColor(key.getId()));

        String label = node.toString().replace("\"", "\\\"");
        String shape = (node instanceof Plan) ? "rectangle" : "ellipse";
        String style = "filled";
        String color = "#" + Integer.toHexString(colour);
        String tooltip = String.format("Id: %s\\nSchema: %s\\nIdentities: %s",
                node.getId(), formatSchema(node), formatIdentities(node));

        sb.append(String.format(
                "\t\"%s\" [label = \"%s#%s\"] [tooltip = \"%s\"] [shape =\"%s\"] [style=\"%s\"] [fillcolor=\"%s\"];%n",
                node.getId(), label, node.getId(), tooltip, shape, style, color));
    }

    private static void edgesToString(StringBuilder sb, Node node) {
        for (int i = 0; i < node.getInputs().size(); ++i) {
            sb.append(String.format("\t\"%d\" -> \"%d\" [label=\"%d\"];%n",
                    node.getInputs().get(i).getId(), node.getId(), i));
        }
    }

    public String toString(Graph graph) {
        StringBuilder sb = new StringBuilder();
        sb.append("digraph G {\n");

        Object2IntMap<Plan> colours = new Object2IntOpenHashMap<>();
        graph.visitOut(node -> nodeToString(colours, sb, node));
        graph.visitOut(node -> edgesToString(sb, node));
        sb.append("}\n");
        return sb.toString();
    }

    public String toString(Node node) {
        LinkedHashSet<Node> nodes = new LinkedHashSet<>();
        Deque<Node> queue = new ArrayDeque<>();
        nodes.add(node);
        queue.add(node);

        while (!queue.isEmpty()) {
            Node current = queue.poll();
            for (Node in : current.getInputs()) {
                if (!nodes.contains(in)) {
                    nodes.add(in);
                    queue.add(in);
                }
            }
        }
        StringBuilder sb = new StringBuilder();
        sb.append("digraph G {\n");
        Object2IntMap<Plan> colours = new Object2IntOpenHashMap<>();
        nodes.forEach(n -> nodeToString(colours, sb, n));
        nodes.forEach(n -> edgesToString(sb, n));
        sb.append("}\n");
        return sb.toString();
    }

    private String formatIdentities(Node node) {
        if (node.getIdentities().isEmpty()) {
            return "none";
        }

        List<String> identities = node.getIdentities().stream()
                .map(GraphPrinter::formatIdentity)
                .collect(Collectors.toList());

        return "\\n    " + String.join("\\n    ", identities);
    }

    private String formatSchema(Node node) {
        if (node instanceof Expression expression) {
            return expression.getType().toString();
        } else if (node instanceof Plan plan) {
            Schema schema = plan.getMeta().getSchema();
            List<String> types = IntStream.range(0, schema.size())
                    .mapToObj(index -> index + ": " + schema.getType(index)).toList();

            return "\\n    " + String.join("\\n    ", types);
        }

        return "n/a";
    }

    private String formatIdentity(Identity identity) {
        String prefix = identity.id().substring(0, 8);
        String columns = Arrays.toString(identity.columns());
        String original = identity.original() ? "" : " (*)";
        return prefix + ": " + columns + original;
    }
}
