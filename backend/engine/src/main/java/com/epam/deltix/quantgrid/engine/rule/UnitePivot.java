package com.epam.deltix.quantgrid.engine.rule;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Collections;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.PivotLocal;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import it.unimi.dsi.fastutil.objects.Object2ObjectOpenCustomHashMap;

/**
 * Unites multiple references to pivoted fields into a single pivot node.
 * This optimization rule allows to pivot all the fields in a single pass.
 */
public class UnitePivot implements Rule {

    @Override
    public void apply(Graph graph) {
        Map<Plan, List<PivotLocal>> pivots = new Object2ObjectOpenCustomHashMap<>(DeduplicateStrategy.INSTANCE);
        graph.visitOut(node -> collect(pivots, node));

        Map<Node, Node> replacements = unite(pivots.values());
        graph.transformOut(node -> replacements.getOrDefault(node, node));
    }

    private static void collect(Map<Plan, List<PivotLocal>> pivots, Node node) {
        if (node instanceof PivotLocal pivot) {
            Plan source = pivot.getSource();
            List<PivotLocal> group = pivots.computeIfAbsent(source, key -> new ArrayList<>());
            group.add(pivot);
        }
    }

    private static Map<Node, Node> unite(Collection<List<PivotLocal>> pivots) {
        Map<Node, Node> replacements = new HashMap<>();

        for (List<PivotLocal> group : pivots) {
            if (group.size() == 1) {
                continue;
            }

            Set<String> uniqueNames = new HashSet<>();
            PivotLocal first = group.get(0);

            for (PivotLocal pivot : group) {
                String[] pivotNames = pivot.getSourceNames();
                Collections.addAll(uniqueNames, pivotNames);
            }

            String[] names = uniqueNames.toArray(String[]::new);
            Object2IntMap<String> index = index(names);
            PivotLocal united = new PivotLocal(
                    first.getLayout(),
                    first.getSource(), first.getKey(), first.getName(), first.getValue(),
                    first.getNames(), first.getNamesKey(),
                    names
            );

            for (PivotLocal plan : group) {
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

    private static void identify(Object2IntMap<String> index, PivotLocal original, PivotLocal replacement) {
        String[] names = original.getSourceNames();

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
                                PivotLocal original, PivotLocal united) {
        String[] names = original.getSourceNames();

        for (Node output : original.getOutputs()) {
            if (output instanceof Get get) {
                int from = get.getColumn();
                int to = index.getInt(names[from]);
                Get replacement = new Get(united, to);
                replacements.put(get, replacement);
            }
        }
    }
}