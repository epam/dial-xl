package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.NestedPivotLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimplePivotLocal;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.Object2ObjectOpenCustomHashMap;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

/**
 * Unites multiple references to pivoted fields into a single pivot node.
 * This optimization rule allows to pivot all the fields in a single pass.
 */
public class UnitePivot implements Rule {

    @Override
    public void apply(Graph graph) {
        Map<Plan, List<Plan>> pivots = new Object2ObjectOpenCustomHashMap<>(DeduplicateStrategy.INSTANCE);
        graph.visitOut(node -> collect(pivots, node));

        Map<Node, Node> replacements = unite(pivots.values());
        graph.transformOut(node -> replacements.getOrDefault(node, node));
    }

    private static void collect(Map<Plan, List<Plan>> pivots, Node node) {
        if (node instanceof SimplePivotLocal pivot) {
            Plan source = pivot.getSource();
            List<Plan> group = pivots.computeIfAbsent(source, key -> new ArrayList<>());
            group.add(pivot);
        } else if (node instanceof NestedPivotLocal pivot) {
            Plan source = pivot.getSource();
            List<Plan> group = pivots.computeIfAbsent(source, key -> new ArrayList<>());
            group.add(pivot);
        }
    }

    private static Map<Node, Node> unite(Collection<List<Plan>> pivots) {
        Map<Node, Node> replacements = new HashMap<>();

        for (List<Plan> group : pivots) {
            if (group.size() == 1) {
                continue;
            }

            Set<String> uniqueNames = new HashSet<>();
            Plan first = group.get(0);

            for (Plan plan : group) {
                String[] pivotNames = getNames(plan);
                Collections.addAll(uniqueNames, pivotNames);
            }

            String[] names = uniqueNames.toArray(String[]::new);
            Object2IntMap<String> index = index(names);
            Plan united;

            if (first instanceof SimplePivotLocal) {
                SimplePivotLocal pivot = (SimplePivotLocal) first;
                united = new SimplePivotLocal(
                        pivot.getLayout(),
                        pivot.getSource(), pivot.getName(), pivot.getValue(),
                        pivot.getNames(), pivot.getNamesKey(),
                        names
                );
            } else {
                NestedPivotLocal pivot = (NestedPivotLocal) first;
                united = new NestedPivotLocal(
                        pivot.getLayout(),
                        pivot.getSource(), pivot.getKey(), pivot.getName(), pivot.getValue(),
                        pivot.getNames(), pivot.getNamesKey(),
                        names
                );
            }

            for (Plan plan : group) {
                identify(index, plan, united);
                replace(replacements, index, plan, united);
            }
        }

        return replacements;
    }

    private static Object2IntMap<String> index(String[] names) {
        Object2IntMap<String> index = new Object2IntOpenHashMap<>(names.length);
        index.defaultReturnValue(-1);

        for (int i = 0; i < names.length; i++) {
            index.put(names[i], i);
        }

        return index;
    }

    private static void identify(Object2IntMap<String> index, Plan original, Plan replacement) {
        String[] names = getNames(original);

        for (Identity identity : original.getIdentities()) {
            if (identity.columns().length == 1) {
                int from = identity.columns()[0];
                int to = index.getInt(names[from]);

                Identity id = new Identity(identity.id(), true, to);
                replacement.getIdentities().add(id);
            }
        }
    }

    private static void replace(Map<Node, Node> replacements, Object2IntMap<String> index,
                                Plan original, Plan united) {
        String[] names = getNames(original);

        for (Node output : original.getOutputs()) {
            if (output instanceof Get get) {
                int from = get.getColumn();
                int to = index.getInt(names[from]);
                Get replacement = new Get(united, to);
                replacements.put(get, replacement);
            }
        }
    }

    private static String[] getNames(Plan original) {
        return original instanceof SimplePivotLocal
                ? ((SimplePivotLocal) original).getSourceNames()
                : ((NestedPivotLocal) original).getSourceNames();
    }
}