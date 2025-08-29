package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import lombok.RequiredArgsConstructor;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RequiredArgsConstructor
public class Merge implements Rule {

    private final Graph from;

    @Override
    public void apply(Graph to) {
        Map<Identity, Plan> map = map(to);
        List<Node> copies = copy(from, to);
        merge(to, map, copies);
    }

    private static Map<Identity, Plan> map(Graph graph) {
        Map<Identity, Plan> map = new HashMap<>();

        graph.visitOut(node -> {
            if (node instanceof Plan plan) {
                for (Identity identity : plan.getIdentities()) {
                    Plan prev = map.put(identity, plan);
                    Util.verify(prev == null);
                }
            }
        });

        return map;
    }

    private static List<Node> copy(Graph from, Graph to) {
        Map<Node, Node> map = new HashMap<>();
        List<Node> copies = new ArrayList<>();

        from.visitOut(node -> {
            List<Node> inputs = node.getInputs().stream().map(map::get).toList();
            Node copy = node.copy(inputs);
            to.add(copy);
            map.put(node, copy);
            copies.add(copy);
        });

        return copies;
    }

    private static void merge(Graph graph, Map<Identity, Plan> map, List<Node> copies) {
        for (Node copy : copies) {
            if (copy instanceof Plan plan) {
                for (Identity identity : plan.getIdentities()) {
                    Util.verify(identity.original());
                    Plan existing = map.get(identity);

                    if (existing != null) {
                        Identity id = RuleUtil.findIdentity(existing, identity);

                        if (RuleUtil.hasSameIdentity(plan, id) && RuleUtil.hasSameIdentity(existing, id)) {
                            graph.replace(plan, existing); // positions and sizes are matched, no need for select
                            break;
                        }

                        SelectLocal select = select(existing, id);
                        graph.replace(plan, select);
                        select.getIdentities().clear();  // remove identities
                        break;
                    }
                }
            }
        }
    }

    private static SelectLocal select(Plan prev, Identity identity) {
        List<Expression> columns = new ArrayList<>();

        for (int column : identity.columns()) {
            columns.add(new Get(prev, column));
        }

        return new SelectLocal(columns);
    }
}