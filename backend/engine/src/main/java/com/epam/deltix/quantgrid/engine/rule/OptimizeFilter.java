package com.epam.deltix.quantgrid.engine.rule;

import java.util.ArrayList;
import java.util.List;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import it.unimi.dsi.fastutil.ints.Int2IntFunction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class OptimizeFilter implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> (node instanceof FilterLocal filter) ? optimize(filter) : node);
    }

    private static Plan optimize(FilterLocal filter) {
        SelectLocal select = null;
        CartesianLocal cartesian = null;

        if (filter.getPlan() instanceof CartesianLocal in) {
            cartesian = in;
        } else if (filter.getPlan() instanceof SelectLocal in) {
            select = in;
            for (Expression expression : select.getExpressions()) {
                if (expression instanceof RowNumber) {
                    cartesian = null;
                    break;
                }

                if (expression instanceof Get get && get.plan() instanceof CartesianLocal cart) {
                    cartesian = cart;
                }
            }
        }

        if (cartesian == null) {
            return filter;
        }

        try {
            Expression condition = filter.getCondition();
            ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

            return tryToOptimize(filter, select, cartesian, conditions);
        } catch (Throwable e) {
            log.warn("Failed to optimize filter={}", filter.getId(), e);
            return filter;
        }
    }

    private static Plan tryToOptimize(FilterLocal filter,
                                      SelectLocal select,
                                      CartesianLocal cartesian,
                                      ConditionAnalyzer.Condition conditions) {
        Int2IntFunction mapping = mapping(cartesian);

        conditions.left.addAll(conditions.constant);
        Plan left = reconnect(cartesian, cartesian.getLeft(), conditions.left, mapping);

        conditions.right.addAll(conditions.constant);
        Plan right = reconnect(cartesian, cartesian.getRight(), conditions.right, mapping);

        ConditionAnalyzer.MixedCondition mixedConditions = ConditionAnalyzer.analyzeMixedConditions(
                conditions.mixed, cartesian);

        List<Expression> postConditions = new ArrayList<>(mixedConditions.other);

        if (!mixedConditions.eq.isEmpty()) {
            List<Expression> leftExpressions = mixedConditions.eq.stream()
                    .map(BinaryOperator::getLeft)
                    .map(e -> ConditionUtil.reconnectExpressions(e, cartesian, left, mapping))
                    .toList();

            List<Expression> rightExpressions = mixedConditions.eq.stream()
                    .map(BinaryOperator::getRight)
                    .map(e -> ConditionUtil.reconnectExpressions(e, cartesian, right, mapping))
                    .toList();

            Plan join = new JoinAllLocal(left, right, leftExpressions, rightExpressions);
            Plan result = reconnect(cartesian, join, postConditions, i -> i);

            return reconnect(cartesian, select, result);
        }

        if (!conditions.left.isEmpty() || !conditions.right.isEmpty()) {
            CartesianLocal product = new CartesianLocal(left, right);
            Plan result = reconnect(cartesian, product, postConditions, i -> i);
            return reconnect(cartesian, select, result);
        }

        log.info("Unable to optimize filter={}", filter.getId());
        return filter;
    }

    private static Int2IntFunction mapping(CartesianLocal cartesian) {
        return i -> cartesian.getMeta().getSchema().getColumn(i);
    }

    private static Plan reconnect(CartesianLocal from,
                                  Plan to,
                                  List<Expression> conditions,
                                  Int2IntFunction mapping) {
        if (conditions.isEmpty()) {
            return to;
        }

        List<Expression> reconnectedConditions = new ArrayList<>();
        for (Expression condition : conditions) {
            Expression reconnectedCondition = ConditionUtil.reconnectExpressions(condition, from, to, mapping);
            reconnectedConditions.add(reconnectedCondition);
        }

        Expression newCondition = ConditionUtil.assembleCondition(reconnectedConditions);
        return new FilterLocal(to, newCondition);
    }

    private static Plan reconnect(CartesianLocal cartesian, SelectLocal select, Plan result) {
        if (select == null) {
            return result;
        }

        Int2IntFunction mapping = key -> key;
        List<Expression> expressions = new ArrayList<>();

        for (Expression expression : select.getExpressions()) {
            Expression reconnected = ConditionUtil.reconnectExpressions(expression, cartesian, result, mapping);
            expressions.add(reconnected);
        }

        return new SelectLocal(expressions);
    }
}
