package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Value;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

public abstract class ExpressionWithPlan<P extends Value, R extends Column> extends Expression {

    protected ExpressionWithPlan(Plan plan, Expression... expressions) {
        super(buildInput(plan, expressions));
    }

    protected ExpressionWithPlan(Plan plan, List<Expression> expressions) {
        super(buildInput(plan, expressions.toArray(Expression[]::new)));
    }

    public final Plan plan() {
        return (Plan) inputs.get(0);
    }

    @Override
    public final Expression expression(int index) {
        return (Expression) inputs.get(index + 1);
    }

    @Override
    @SuppressWarnings("unchecked")
    public final R evaluate() {
        P value = (P) plan().execute();
        return evaluate(value);
    }

    protected abstract R evaluate(P arg);

    private static List<Node> buildInput(Plan plan, Expression... expressions) {
        List<Node> inputs = new ArrayList<>(expressions.length + 1);
        inputs.add(plan);
        Collections.addAll(inputs, expressions);
        return inputs;
    }
}
