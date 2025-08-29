package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import org.junit.jupiter.api.Assertions;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;

public class TraceVerifier implements Rule {
    @Override
    public void apply(Graph graph) {
        Map<Node, Set<Long>> ids = new HashMap<>();

        graph.visitIn(node -> {
            Plan original = NodeUtil.unwrapOriginal(node);
            if (original instanceof Scalar || original instanceof SelectLocal) {
                if (!node.getTraces().isEmpty()) {
                    Assertions.fail("There is a node with trace:\n" + GraphPrinter.toString(node));
                }

                Set<Long> nodeIds = new HashSet<>();

                for (Node output : node.getOutputs()) {
                    Set<Long> outIds = ids.get(output);
                    nodeIds.addAll(outIds);
                }

                ids.put(node, nodeIds);
                return;
            }

            if (node.getTraces().isEmpty()) {
                Assertions.fail("There is a node without trace:\n" + GraphPrinter.toString(node));
            }

            Set<Long> actualIds = new HashSet<>();
            for (Trace trace : node.getTraces()) {
                actualIds.add(trace.id());
            }

            for (Node output : node.getOutputs()) {
                Set<Long> expectedIds = ids.get(output);
                if (!actualIds.containsAll(expectedIds)) {
                    TreeSet<Long> missingIds = new TreeSet<>(expectedIds);
                    missingIds.removeAll(actualIds);

                    Assertions.fail("There is a node without traces"
                            + ". Missing operation ids: " + missingIds
                            + ". Node:\n" + GraphPrinter.toString(node));
                }
            }

            ids.put(node, actualIds);
        });
    }
}