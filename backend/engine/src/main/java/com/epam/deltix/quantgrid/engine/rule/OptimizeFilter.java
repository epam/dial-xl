package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import it.unimi.dsi.fastutil.ints.Int2IntFunction;
import lombok.extern.slf4j.Slf4j;

import java.util.ArrayList;
import java.util.List;

@Slf4j
public class OptimizeFilter implements Rule {

    @Override
    public void apply(Graph graph) {
        graph.transformOut(node -> {
            if (node instanceof FilterLocal filter) {
                return optimize(filter);
            }
            return node;
        });
    }

    private static Plan optimize(FilterLocal filter) {
        if (!(filter.getPlan() instanceof CartesianLocal cartesian)) {
            // Filter does not match optimization criteria -> return original
            return filter;
        }

        Expression condition = filter.getCondition();
        ConditionAnalyzer.ConditionGroups conditionGroups = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        return tryToOptimize(filter, cartesian, conditionGroups);
    }

    private static Plan tryToOptimize(FilterLocal originalFilter,
                               CartesianLocal cartesian,
                               ConditionAnalyzer.ConditionGroups conditionGroups) {

        Int2IntFunction cartesianToSourceMapping = cartesianMapping(cartesian);

        // prepare left table
        conditionGroups.left.addAll(conditionGroups.constant);
        Plan leftTable =
                reconnectAndAssembleConditions(cartesian, cartesian.getLeft(), conditionGroups.left,
                        cartesianToSourceMapping);

        // prepare right table
        conditionGroups.right.addAll(conditionGroups.constant);
        Plan rightTable =
                reconnectAndAssembleConditions(cartesian, cartesian.getRight(), conditionGroups.right,
                        cartesianToSourceMapping);

        ConditionAnalyzer.OptimizationConditionGroups optimizationConditionGroups =
                ConditionAnalyzer.analyzeMixedCondition(conditionGroups.mixed, cartesian);

        List<Expression> postFilterConditions = new ArrayList<>(optimizationConditionGroups.other);

        Plan optimizedFilter = null;
        if (!optimizationConditionGroups.eq.isEmpty()) {
            List<Expression> leftExpressions = optimizationConditionGroups.eq.stream()
                    .map(BinaryOperator::getLeft)
                    .map(e -> ConditionUtil.cloneExpressionAndConnectToSource(e, cartesian, leftTable,
                            cartesianToSourceMapping))
                    .toList();
            List<Expression> rightExpressions = optimizationConditionGroups.eq.stream()
                    .map(BinaryOperator::getRight)
                    .map(e -> ConditionUtil.cloneExpressionAndConnectToSource(e, cartesian, rightTable,
                            cartesianToSourceMapping))
                    .toList();

            optimizedFilter = new JoinAllLocal(leftTable, rightTable, leftExpressions, rightExpressions);
        }

        if (optimizedFilter != null) {
            return reconnectAndAssembleConditions(cartesian, optimizedFilter, postFilterConditions, i -> i);

        } else if (!conditionGroups.left.isEmpty() || !conditionGroups.right.isEmpty()) {
            CartesianLocal newCartesian = new CartesianLocal(leftTable, rightTable);
            return reconnectAndAssembleConditions(cartesian, newCartesian, postFilterConditions, i -> i);

        } else {
            log.warn("Failed to optimize filter={}", originalFilter.getId());
            return originalFilter;
        }
    }

    private static Int2IntFunction cartesianMapping(CartesianLocal cartesian) {
        return i -> cartesian.getMeta().getSchema().getColumn(i);
    }

    private static Plan reconnectAndAssembleConditions(CartesianLocal reconnectFrom,
                                                Plan reconnectTo,
                                                List<Expression> conditions,
                                                Int2IntFunction mapping) {
        if (conditions.isEmpty()) {
            return reconnectTo;
        }

        List<Expression> reconnectedConditions = new ArrayList<>();
        for (Expression condition : conditions) {
            Expression reconnectedCondition =
                    ConditionUtil.cloneExpressionAndConnectToSource(condition, reconnectFrom, reconnectTo, mapping);
            reconnectedConditions.add(reconnectedCondition);
        }

        Expression newCondition = ConditionUtil.assembleCondition(reconnectedConditions);
        return new FilterLocal(reconnectTo, newCondition);
    }
}
