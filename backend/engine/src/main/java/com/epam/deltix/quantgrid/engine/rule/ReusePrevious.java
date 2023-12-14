package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Running;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

public class ReusePrevious implements Rule {

    private final Graph previous;

    public ReusePrevious(Graph previous) {
        this.previous = previous;
    }

    @Override
    public void apply(Graph graph) {
        Set<Node> closest = collect(previous);
        Collection<Node> copy = copy(previous, closest);
        Map<Identity, Plan> map = map(copy);
        replace(graph, map);
    }

    private static Set<Node> collect(Graph graph) {
        Set<Node> set = new HashSet<>();

        graph.visitOut(node -> {
            if (node instanceof Executed || node instanceof Running || set.contains(node)) {
                set.add(node);

                if (node instanceof Expression || node.getIdentities().isEmpty()) {
                    set.addAll(node.getOutputs());
                }
            }
        });

        // recursively add all inputs because previous step can add only one path
        graph.visitIn(node -> {
            if (set.contains(node)) {
                set.addAll(node.getInputs());
            }
        });

        return set;
    }

    private static Collection<Node> copy(Graph graph, Set<Node> nodes) {
        Map<Node, Node> copy = new HashMap<>();

        graph.visitOut(node -> {
            if (nodes.contains(node)) {
                List<Node> inputs = node.getInputs().stream().map(copy::get).toList();
                Node clone = node.getIdentities().contains(Scalar.IDENTITY) ? new Scalar() : node.copy(inputs);
                copy.put(node, clone);
            }
        });

        return copy.values();
    }

    private static Map<Identity, Plan> map(Collection<Node> copy) {
        Map<Identity, Plan> map = new HashMap<>();

        for (Node node : copy) {
            if (node instanceof Plan plan) {
                for (Identity identity : node.getIdentities()) {
                    if (identity.original()) {
                        Plan prev = map.put(identity, plan);
                        Util.verify(prev == null);
                    }
                }
            }
        }
        return map;
    }

    private static void replace(Graph graph, Map<Identity, Plan> map) {
        graph.transformOut(node -> {
            if (node instanceof Plan plan) {
                for (Identity identity : plan.getIdentities()) {
                    Plan prev = map.get(identity);

                    if (prev != null) {
                        Util.verify(identity.original());
                        Identity id = RuleUtil.findIdentity(prev, identity);

                        if (RuleUtil.hasSameIdentity(plan, id)) {
                            return prev;
                        }

                        SelectLocal select = select(prev, id);
                        graph.replace(plan, select);
                        select.getIdentities().clear();
                        return plan; // identities must be removed
                    }
                }
            }

            return node;
        });
    }

    private static SelectLocal select(Plan prev, Identity identity) {
        List<Expression> columns = new ArrayList<>();

        for (int column : identity.columns()) {
            columns.add(new Get(prev, column));
        }

        return new SelectLocal(columns);
    }
}