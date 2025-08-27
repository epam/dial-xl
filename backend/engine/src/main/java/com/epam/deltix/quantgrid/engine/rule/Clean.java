package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.node.plan.local.IndexResultLocal;
import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;

import java.util.HashMap;
import java.util.HashSet;
import java.util.Map;
import java.util.Set;

public class Clean implements Rule {

    private final boolean cleanupNotRequired;

    public Clean() {
        this(false);
    }

    public Clean(boolean cleanupNotRequired) {
        this.cleanupNotRequired = cleanupNotRequired;
    }

    @Override
    public void apply(Graph graph) {
        Map<Node, Set<ResultPlan>> map = collect(graph);
        graph.transformOut(node -> isDead(node, map) ? null : node);
    }

    private Map<Node, Set<ResultPlan>> collect(Graph graph) {
        if (!cleanupNotRequired) {
            return Map.of();
        }

        Map<Node, Set<ResultPlan>> map = new HashMap<>();
        graph.visitOut(node -> {
            if (node instanceof ViewportLocal viewport) {
                Expression source = viewport.getSource();
                if (source instanceof Text text) {
                    source = text.expression(0);
                }

                Set<ResultPlan> set = map.computeIfAbsent(source, ignore -> new HashSet<>());
                map.put(viewport, set);

                if (viewport.getComputationType() == ComputationType.REQUIRED) {
                    set.add(viewport);
                }
            } else if (node instanceof IndexResultLocal index) {
                Plan source = index.getSource();
                Set<ResultPlan> set = map.computeIfAbsent(source, ignore -> new HashSet<>());
                map.put(index, set);

                if (index.getComputationType() == ComputationType.REQUIRED) {
                    set.add(index);
                }
            }
        });
        return map;
    }

    private boolean isDead(Node node, Map<Node, Set<ResultPlan>> map) {
        if (!node.getOutputs().isEmpty()) {
            return false;
        }

        Plan original = NodeUtil.unwrapOriginal(node);
        boolean isRunning = (original != node);

        if (original instanceof ResultPlan result) {
            if (result.getComputationType() == ComputationType.REQUIRED || isRunning || !cleanupNotRequired) {
                return false;
            }

            if (result.getComputationType() == ComputationType.OPTIONAL) {
                return true;
            }

            boolean dead = true;

            for (ResultPlan required : map.get(result)) {
                if (result.getClass() == required.getClass()) {
                    if (result.getComputationId() == required.getComputationId()) {
                        dead = true; // remove a conditional viewport if the same computation has a required viewport
                        break;
                    }

                    dead = false;
                }
            }

            return dead;
        }

        return true;
    }
}
