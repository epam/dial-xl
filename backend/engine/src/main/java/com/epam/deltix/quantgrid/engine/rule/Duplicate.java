package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan0;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Duplicates input select nodes for a plan node.
 * So that each plan has its own select nodes and subgraph connected to them.
 * It dismantles false cycles for Carry rule. Check com.epam.deltix.quantgrid.engine.rule.CarryTest#testFalseCycle().
 */
public class Duplicate implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(Duplicate::duplicate);
    }

    private static Node duplicate(Node node) {
        boolean skip = (node instanceof Expression)
                || (node instanceof Plan0<?>)
                || (node.getInputs().stream().noneMatch(in -> in instanceof SelectLocal));

        if (skip) {
            return node;
        }

        Plan plan = (Plan) node;
        List<Node> inputs = new ArrayList<>();
        Map<Node, Node> duplicates = new HashMap<>();

        for (Node in : plan.getInputs()) {
            Node duplicate = null;

            if (in instanceof SelectLocal inSelect) {
                duplicate = inSelect.copy();
            } else if (in instanceof Plan inPlan) {
                duplicate = inPlan;
            } else if (in instanceof Expression inExpression) {
                duplicate = duplicate(inExpression, duplicates);
            }

            if (duplicate == null) {
                return node;
            }

            inputs.add(duplicate);
            duplicates.put(in, duplicate);
        }

        return node.copy(inputs);
    }

    private static Node duplicate(Node node, Map<Node, Node> duplicates) {
        Node duplicate = duplicates.get(node);
        if (duplicate != null) {
            return duplicate;
        }

        if (node instanceof Constant constant) {
            duplicate = constant; // do not duplicate too much
        } else if (node instanceof Expand expand) {
            Plan input = (Plan) duplicates.get(expand.getSource());
            duplicate = (input == null) ? expand : expand.copy(input, expand.getScalar()); // do not duplicate too much
        } else if (node instanceof Projection projection) {
            Expression key = (Expression) duplicate(projection.getKey(), duplicates);
            duplicate = key == null ? null : projection.copy(key, projection.getValue());
        } else if (node instanceof Expression || node instanceof SelectLocal) {
            List<Node> inputs = new ArrayList<>();

            for (Node source : node.getInputs()) {
                Node copy = duplicate(source, duplicates);
                inputs.add((copy == null) ? source : copy);
            }

            duplicate = node.copy(inputs);
        }

        if (duplicate != null) {
            duplicates.put(node, duplicate);
        }

        return duplicate;
    }
}
