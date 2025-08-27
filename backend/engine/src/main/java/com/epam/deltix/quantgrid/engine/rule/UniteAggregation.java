package com.epam.deltix.quantgrid.engine.rule;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.IntStream;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import it.unimi.dsi.fastutil.objects.ObjectOpenHashSet;
import lombok.EqualsAndHashCode;
import lombok.RequiredArgsConstructor;

public class UniteAggregation implements Rule {
    @Override
    public void apply(Graph graph) {
        ObjectOpenHashSet<Group> groups = collect(graph);
        unite(graph, groups);
    }

    private static ObjectOpenHashSet<Group> collect(Graph graph) {
        Map<Node, Set<AggregateByLocal>> dependencies = new HashMap<>();
        Map<AggregateByLocal, Group> aggregates = new HashMap<>();
        ObjectOpenHashSet<Group> groups = new ObjectOpenHashSet<>();

        graph.visitOut(node -> {
            if (node instanceof AggregateByLocal aggregate) {
                int order = 0;
                for (AggregateByLocal dependency : dependencies.getOrDefault(aggregate, Set.of())) {
                    if (Objects.equals(dependency.getKeys(), aggregate.getKeys())) {
                        Group group = aggregates.get(dependency);
                        order = Math.max(order, group.order + 1);
                    }
                }

                dependencies.put(aggregate, Set.of(aggregate));
                Group group = groups.addOrGet(new Group(aggregate.getKeys(), order));
                group.aggregates.add(aggregate);
                aggregates.put(aggregate, group);
            }

            Set<AggregateByLocal> dependency = dependencies.getOrDefault(node, Set.of());
            for (Node output : node.getOutputs()) {
                dependencies.computeIfAbsent(output, key -> new HashSet<>()).addAll(dependency);
            }
        });

        return groups;
    }

    private static void unite(Graph graph, ObjectOpenHashSet<Group> groups) {
        for (Group group : groups) {
            if (group.aggregates.size() < 2) {
                continue;
            }

            List<AggregateByLocal.Aggregation> all = group.aggregates.stream()
                    .map(AggregateByLocal::getAggregations).flatMap(Collection::stream).toList();

            AggregateByLocal united = new AggregateByLocal(group.aggregates.get(0).getPlan(), group.keys, all);

            List<Expression> keys = IntStream.range(0, group.keys.size())
                    .mapToObj(i -> (Expression) new Get(united, i)).toList();

            for (int i = 0, position = keys.size(); i < group.aggregates.size(); i++) {
                AggregateByLocal aggregate = group.aggregates.get(i);
                List<Expression> columns = new ArrayList<>(keys);

                for (int j = keys.size(), size = aggregate.getMeta().getSchema().size(); j < size; j++) {
                    Get val = new Get(united, position++);
                    columns.add(val);
                }

                SelectLocal replacement = new SelectLocal(columns);
                graph.replace(aggregate, replacement);
                RuleUtil.moveIdentity(replacement, united);
            }
        }
    }

    @RequiredArgsConstructor
    @EqualsAndHashCode(onlyExplicitlyIncluded = true)
    private static class Group {
        final List<AggregateByLocal> aggregates = new ArrayList<>();
        @EqualsAndHashCode.Include
        final List<Expression> keys;
        @EqualsAndHashCode.Include
        final int order;
    }
}