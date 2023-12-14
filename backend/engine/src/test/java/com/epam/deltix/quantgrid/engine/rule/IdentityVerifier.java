package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import org.junit.jupiter.api.Assertions;

import java.util.HashMap;
import java.util.Map;

public class IdentityVerifier implements Rule {

    @Override
    public void apply(Graph graph) {
        Map<Identity, Node> identities = new HashMap<>();

        graph.visitIn(node -> {
            if (node instanceof Expression) {
                return;
            }

            if (node instanceof SelectLocal || node instanceof ViewportLocal) {
                Assertions.assertTrue(node.getIdentities().isEmpty());
            }

            for (Identity id : node.getIdentities()) {
                Node prev = identities.put(id, node);

                if (prev != null) {
                    GraphPrinter.print("Graph with same identities: ", graph);
                    Assertions.fail(prev + "#" + prev.getId() + " and " + node + "#" + node.getId()
                            + " have the same identity: " + id);
                }
            }

        });
    }
}
