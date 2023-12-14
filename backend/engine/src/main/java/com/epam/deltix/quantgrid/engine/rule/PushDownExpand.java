package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;

import java.util.ArrayList;
import java.util.List;

public class PushDownExpand implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (node instanceof Expression expression && hasAllExpands(expression)) {
                List<Node> inputs = new ArrayList<>();
                Plan source = null;

                for (Node in : expression.getInputs()) {
                    Expand expand = (Expand) in;
                    Expression scalar = expand.getScalar();

                    inputs.add(scalar);
                    source = expand.getSource();
                }

                Expression scalar = expression.copy(inputs);
                return new Expand(source, scalar);
            }

            if (node instanceof Projection projection
                    && projection.getKey() instanceof Expand expand
                    && expand.getScalar() instanceof Get key
                    && projection.getValue().getLayout() instanceof Scalar) {

                Projection newProjection = new Projection(key, projection.getValue());
                return new Expand(expand.getSource(), newProjection);
            }

            return node;
        });
    }

    private static boolean hasAllExpands(Expression expression) {
        return !expression.getInputs().isEmpty()
                && expression.getInputs().stream().allMatch(in -> in instanceof Expand);
    }
}