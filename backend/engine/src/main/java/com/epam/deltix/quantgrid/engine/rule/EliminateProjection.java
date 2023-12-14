package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;

public class EliminateProjection implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (node instanceof Projection projection && projection.getKey() instanceof Get key) {
                Plan plan = key.plan();

                boolean keyScalar = (plan.getLayout() instanceof Scalar);
                boolean keyNumber = (plan instanceof SelectLocal select)
                        && (key.getExpression(select) instanceof RowNumber);

                if (!keyNumber) {
                    return node;
                }

                Expression value = projection.getValue();
                boolean valueScalar = (value.getLayout() instanceof Scalar);

                if (value instanceof Expand expand) { // or you need to prove that it has no NaN's
                    return keyScalar ? expand.getScalar() : new Expand(plan, expand.getScalar());
                }

                if (valueScalar) { // or you need to prove that it has no NaN's
                    return keyScalar ? value : new Expand(plan, value);
                }
            }

            return node;
        });
    }
}
