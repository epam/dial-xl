package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;

@UtilityClass
public class ConditionAnalyzer {

    public Condition analyzeCondition(Expression condition, Plan join) {
        List<Expression> subConditions = new ArrayList<>();
        splitConditionAroundAnd(condition, subConditions);

        return classifyConditions(subConditions, join);
    }

    public MixedCondition analyzeMixedConditions(List<Expression> conditions, Plan join) {
        MixedCondition group = new MixedCondition();
        for (Expression condition : conditions) {
            if (condition instanceof BinaryOperator binop) {
                BinaryOperation operation = binop.getOperation();
                if (operation.equals(BinaryOperation.EQ)) {
                    ConditionKind leftKind = classifyCondition(binop.getLeft(), join);
                    ConditionKind rightKind = classifyCondition(binop.getRight(), join);

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

    private Condition classifyConditions(List<Expression> conditions, Plan join) {
        Condition conditionGroups = new Condition();
        for (Expression condition : conditions) {
            switch (classifyCondition(condition, join)) {
                case LEFT -> conditionGroups.left.add(condition);
                case RIGHT -> conditionGroups.right.add(condition);
                case CONSTANT -> conditionGroups.constant.add(condition);
                case MIXED -> conditionGroups.mixed.add(condition);
            }
        }

        return conditionGroups;
    }

    private ConditionKind classifyCondition(Expression condition, Plan join) {
        condition = RuleUtil.reduceGet(condition);
        if (condition instanceof Get get) {
            if (get.plan() != join) {
                return ConditionKind.MIXED;
            }

            Schema schema = join.getMeta().getSchema();
            int planIndex = schema.getInput(get.getColumn());
            return planIndex == 0 ? ConditionKind.LEFT : ConditionKind.RIGHT;
        } else if (condition instanceof Expand) {
            return ConditionKind.CONSTANT;
        } else if (condition instanceof Projection projection) {
            return classifyCondition(projection.getKey(), join);
        } else {
            return condition.getInputs().stream()
                    .map(input -> {
                        if (input instanceof Expression expression) {
                            return classifyCondition(expression, join);
                        }

                        return (join == input) ? ConditionKind.CONSTANT : ConditionKind.MIXED;
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

    public static class Condition {
        List<Expression> constant = new ArrayList<>();
        List<Expression> left = new ArrayList<>();
        List<Expression> right = new ArrayList<>();
        List<Expression> mixed = new ArrayList<>();
    }

    public static class MixedCondition {
        List<BinaryOperator> eq = new ArrayList<>();
        List<Expression> other = new ArrayList<>();
    }
}
