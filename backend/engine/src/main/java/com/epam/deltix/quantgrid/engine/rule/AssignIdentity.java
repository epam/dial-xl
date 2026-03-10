package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NotDeterministic;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.store.Store;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import java.util.UUID;
import java.util.stream.IntStream;

@Slf4j
@RequiredArgsConstructor
public class AssignIdentity implements Rule {

    private final Store store;

    @Override
    public void apply(Graph graph) {
        graph.visitOut(node -> {
            if (node instanceof SelectLocal || node instanceof ResultPlan) {
                return;
            }

            if (node instanceof NotDeterministic notDeterministic) {
                String link = linkId();
                String from = node.semanticId();
                String to = notDeterministic.withLink(link).semanticId();

                link = store.link(link, from, to);
                Node replacement = notDeterministic.withLink(link);
                to = replacement.semanticId();

                log.info("Mapping identity through link {} from {} to {}", link, from, to);

                graph.replace(node, replacement);
                node = replacement;
            }

            String id = node.semanticId();
            int size = (node instanceof Plan plan) ? plan.getMeta().getSchema().size() : 1;
            int[] mapping = IntStream.range(0, size).toArray();
            Identity identity = new Identity(id, true, mapping);
            node.getIdentities().add(identity);
        });
    }

    private String linkId() {
        return UUID.randomUUID().toString().replace("-", "");
    }
}