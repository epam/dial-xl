package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import lombok.RequiredArgsConstructor;

import java.util.Set;

@RequiredArgsConstructor
public class Cancel implements Rule {

    private final long computationId;
    private final Set<ParsedKey> keys;

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (NodeUtil.unwrapOriginal(node) instanceof ResultPlan result
                    && result.getComputationId() == computationId
                    && (keys == null || keys.contains(result.getKey()))) {
                return null;
            }

            return node;
        });
    }
}