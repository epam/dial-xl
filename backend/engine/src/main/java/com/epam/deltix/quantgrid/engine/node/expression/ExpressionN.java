package com.epam.deltix.quantgrid.engine.node.expression;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.value.Column;

import java.util.ArrayList;
import java.util.List;

public abstract class ExpressionN<T extends Column, R extends Column> extends Expression {

    protected ExpressionN(Expression... expressions) {
        super(expressions);
    }

    protected ExpressionN(List<Expression> expressions) {
        super(expressions.stream().map(Node.class::cast).toList());
    }

    @Override
    protected Plan layout() {
        return expression(0).getLayout();
    }

    @Override
    public R evaluate() {
        List<T> columns = new ArrayList<>();
        int expressionCount = inputs.size();
        for (int i = 0; i < expressionCount; i++) {
            columns.add(expression(i).evaluate());
        }
        return evaluate(columns);
    }

    protected abstract R evaluate(List<T> args);
}
