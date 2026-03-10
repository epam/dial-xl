package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.PeriodSeriesColumn;
import com.epam.deltix.quantgrid.engine.value.StringColumn;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class ConstantFolding implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (node instanceof Expression expression && hasAllConstants(expression)) {
                Plan layout = expression.getLayout();
                Column value = tryEvaluate(expression);

                if (value == null) {
                    return node;
                }

                if (value instanceof DoubleColumn constant) {
                    return new Constant(layout, constant.get(0));
                }

                if (value instanceof StringColumn constant) {
                    return new Constant(layout, constant.get(0));
                }

                if (value instanceof PeriodSeriesColumn constant) {
                    return new Constant(layout, constant.get(0));
                }
            }

            return node;
        });
    }

    private static Column tryEvaluate(Expression expression) {
        try {
            return expression.evaluate();
        } catch (Throwable error) {
            log.warn("Failed to evaluate expression at constant folding", error);
            return null;
        }
    }

    private static boolean hasAllConstants(Expression expression) {
        return expression.getInputs().stream().allMatch(in -> in instanceof Constant);
    }
}
