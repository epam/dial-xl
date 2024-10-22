package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class ConditionAnalyzer {

    public ConditionGroups analyzeCondition(Expression condition, CartesianLocal cartesian) {
        List<Expression> subConditions = new ArrayList<>();
        splitConditionAroundAnd(condition, subConditions);

        return classifyConditions(subConditions, cartesian);
    }

    public OptimizationConditionGroups analyzeMixedCondition(List<Expression> conditions,
                                                             CartesianLocal cartesian) {
        OptimizationConditionGroups group = new OptimizationConditionGroups();
        for (Expression condition : conditions) {
            if (condition instanceof BinaryOperator binop) {
                BinaryOperation operation = binop.getOperation();
                if (operation.equals(BinaryOperation.EQ)) {
                    ConditionKind leftKind = classifyCondition(binop.getLeft(), cartesian);
                    ConditionKind rightKind = classifyCondition(binop.getRight(), cartesian);

                    boolean isLeftRight = leftKind == ConditionKind.LEFT && rightKind == ConditionKind.RIGHT;
                    boolean isRightLeft = leftKind == ConditionKind.RIGHT && rightKind == ConditionKind.LEFT;

                    if (isRightLeft || isLeftRight) {
                        BinaryOperator swappedBinop = isLeftRight ? binop : binop.swapOperands();
                        group.eq.add(swappedBinop);
                        continue;
                    }
                }
            }
            group.other.add(condition);
        }

        return group;
    }

    private void splitConditionAroundAnd(Expression condition, List<Expression> subConditions) {
        if (condition instanceof BinaryOperator binop && binop.getOperation().equals(BinaryOperation.AND)) {
            splitConditionAroundAnd(binop.getLeft(), subConditions);
            splitConditionAroundAnd(binop.getRight(), subConditions);
        } else {
            subConditions.add(condition);
        }
    }

    private ConditionGroups classifyConditions(List<Expression> conditions, CartesianLocal cartesian) {
        ConditionGroups conditionGroups = new ConditionGroups();
        for (Expression condition : conditions) {
            switch (classifyCondition(condition, cartesian)) {
                case LEFT -> conditionGroups.left.add(condition);
                case RIGHT -> conditionGroups.right.add(condition);
                case CONSTANT -> conditionGroups.constant.add(condition);
                case MIXED -> conditionGroups.mixed.add(condition);
            }
        }

        return conditionGroups;
    }

    private ConditionKind classifyCondition(Expression condition, CartesianLocal cartesian) {
        if (condition instanceof Get get) {
            Plan plan = get.plan();

            if (plan != cartesian) {
                return ConditionKind.MIXED;
            }

            return cartesian.isOnLeft(get) ? ConditionKind.LEFT : ConditionKind.RIGHT;
        } else if (condition instanceof Expand expand) {
            Plan plan = expand.plan();
            return plan == cartesian ? ConditionKind.CONSTANT : ConditionKind.MIXED;
        } else {
            return condition.getInputs().stream()
                    .map(input -> {
                        if (input instanceof Expression expression) {
                            return classifyCondition(expression, cartesian);
                        }

                        return (cartesian == input) ? ConditionKind.CONSTANT : ConditionKind.MIXED;
                    })
                    .reduce(ConditionKind.CONSTANT, ConditionAnalyzer::combine);
        }
    }

    private ConditionKind combine(ConditionKind left, ConditionKind right) {
        if (left == right) {
            return left;
        } else if (left == ConditionKind.CONSTANT) {
            return right;
        } else if (right == ConditionKind.CONSTANT) {
            return left;
        } else {
            return ConditionKind.MIXED;
        }
    }


    public enum ConditionKind {
        CONSTANT,
        LEFT,
        RIGHT,
        MIXED
    }

    public static class ConditionGroups {
        List<Expression> constant = new ArrayList<>();
        List<Expression> left = new ArrayList<>();
        List<Expression> right = new ArrayList<>();
        List<Expression> mixed = new ArrayList<>();
    }

    public static class OptimizationConditionGroups {
        List<BinaryOperator> eq = new ArrayList<>();
        List<Expression> other = new ArrayList<>();
    }
}
