package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import it.unimi.dsi.fastutil.longs.LongOpenHashSet;
import it.unimi.dsi.fastutil.longs.LongSet;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

public class AssignTrace implements Rule {

    @Override
    public void apply(Graph graph) {
        propagate(graph);
        normalize(graph);
    }

    private static void propagate(Graph graph) {
        Map<Node, LongSet> ids = new HashMap<>();
        graph.visitOut(node -> {
            LongSet set = new LongOpenHashSet();

            for (Trace trace : node.getTraces()) {
                set.add(trace.id());
            }

            ids.put(node, set);
        });

        graph.visitIn(node -> {
            for (Node in : node.getInputs()) {
                LongSet set = ids.get(in);

                for (Trace trace : node.getTraces()) {
                    if (!set.contains(trace.id())) {
                        in.getTraces().add(trace);
                    }
                }
            }
        });
    }

    private static void normalize(Graph graph) {
        graph.visitOut(node -> {
            Plan original = NodeUtil.unwrapOriginal(node);
            if (original instanceof Scalar || original instanceof SelectLocal) {
                node.getTraces().clear();
                return;
            }

            List<Trace> traces = new ArrayList<>(node.getTraces());
            for (Trace trace : traces) {
                for (Trace other : node.getTraces()) {
                    if (trace != other && trace.id() == other.id() && trace.key().equals(other.key())
                            && trace.type() == other.type() && trace.sheet().equals(other.sheet())
                            && trace.start() <= other.start() && other.end() <= trace.end()) {
                        node.getTraces().remove(trace);
                        break;
                    }
                }
            }
        });
    }
}