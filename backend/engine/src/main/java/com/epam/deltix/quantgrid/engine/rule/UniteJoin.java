package com.epam.deltix.quantgrid.engine.rule;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinSingleLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenCustomHashMap;
import it.unimi.dsi.fastutil.objects.ObjectOpenHashSet;
import lombok.EqualsAndHashCode;
import lombok.RequiredArgsConstructor;

public class UniteJoin implements Rule {
    @Override
    public void apply(Graph graph) {
        ObjectOpenHashSet<Group> groups = collect(graph);
        unite(graph, groups);
    }

    private static ObjectOpenHashSet<Group> collect(Graph graph) {
        Map<Node, Set<JoinSingleLocal>> dependencies = new HashMap<>();
        Map<JoinSingleLocal, Group> joins = new HashMap<>();
        ObjectOpenHashSet<Group> groups = new ObjectOpenHashSet<>();

        graph.visitOut(node -> {
            if (node instanceof JoinSingleLocal join) {
                int order = 0;
                for (JoinSingleLocal dependency : dependencies.getOrDefault(join, Set.of())) {
                    if (Objects.equals(dependency.getLeftKeys(), join.getLeftKeys())
                            && Objects.equals(dependency.getRightKeys(), join.getRightKeys())) {
                        Group group = joins.get(dependency);
                        order = Math.max(order, group.order + 1);
                    }
                }

                dependencies.put(join, Set.of(join));
                Group group = groups.addOrGet(new Group(join.getLeftKeys(), join.getRightKeys(), order));
                group.joins.add(join);
                joins.put(join, group);
            }

            Set<JoinSingleLocal> dependency = dependencies.getOrDefault(node, Set.of());
            for (Node output : node.getOutputs()) {
                dependencies.computeIfAbsent(output, key -> new HashSet<>()).addAll(dependency);
            }
        });

        return groups;
    }

    private static void unite(Graph graph, ObjectOpenHashSet<Group> groups) {
        for (Group group : groups) {
            if (group.joins.size() < 2) {
                continue;
            }

            List<Expression> rightColumns = new ArrayList<>();
            Object2IntMap<Expression> rightMapping = new Object2IntOpenCustomHashMap<>(DeduplicateStrategy.INSTANCE);
            rightMapping.defaultReturnValue(-1);

            for (JoinSingleLocal join : group.joins) {
                Plan right = join.getRight();

                for (int i = 0; i < right.getMeta().getSchema().size(); i++) {
                    Expression expression = RuleUtil.reduceGet(new Get(right, i));

                    if (rightMapping.putIfAbsent(expression, rightColumns.size()) < 0) {
                        rightColumns.add(expression);
                    }
                }
            }

            SelectLocal rightTable = new SelectLocal(rightColumns);
            JoinSingleLocal united = new JoinSingleLocal(group.joins.get(0).getLeft(), rightTable,
                    group.leftKeys, group.rightKeys);

            for (JoinSingleLocal join : group.joins) {
                List<Expression> columns = new ArrayList<>();
                Plan right = join.getRight();

                for (int i = 0; i < right.getMeta().getSchema().size(); i++) {
                    Expression expression = RuleUtil.reduceGet(new Get(right, i));
                    int position = rightMapping.getInt(expression);
                    columns.add(new Get(united, position));
                }

                SelectLocal replacement = new SelectLocal(columns);
                graph.replace(join, replacement);
                RuleUtil.moveIdentity(replacement, united);
            }
        }
    }

    @RequiredArgsConstructor
    @EqualsAndHashCode(onlyExplicitlyIncluded = true)
    private static class Group {
        final List<JoinSingleLocal> joins = new ArrayList<>();
        @EqualsAndHashCode.Include
        final List<Expression> leftKeys;
        @EqualsAndHashCode.Include
        final List<Expression> rightKeys;
        @EqualsAndHashCode.Include
        final int order;
    }
}