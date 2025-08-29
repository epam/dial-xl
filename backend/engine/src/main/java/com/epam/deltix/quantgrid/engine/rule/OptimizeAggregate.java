package com.epam.deltix.quantgrid.engine.rule;

import java.util.ArrayList;
import java.util.List;
import java.util.stream.IntStream;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.meta.Schema;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.If;
import com.epam.deltix.quantgrid.engine.node.expression.UnaryFunction;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinSingleLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import it.unimi.dsi.fastutil.ints.Int2IntFunction;
import lombok.extern.slf4j.Slf4j;

@Slf4j
public class OptimizeAggregate implements Rule {

    @Override
    public void apply(Graph graph) {
        Scalar scalar = RuleUtil.scalar(graph);
        graph.transformOut(node -> (node instanceof AggregateLocal aggregate) ? optimize(scalar, aggregate) : node);
    }

    private static Plan optimize(Scalar scalar, AggregateLocal aggregate) {
        try {
            JoinAllLocal join = source(aggregate);
            Schema schema = aggregate.getMeta().getSchema();

            if (aggregate.getKey() == null || schema.size() != 1 || schema.getInput(0) >= 0
                    || join == null || join.getLeft().getLayout() != aggregate.getLayout()) {
                // expectation: contains key that comes from left side, left side is layout with RowNumber
                // expectation: result is 1 column, result does not contain row references
                // result: does not optimize FIRST/LAST/SINGLE/INDEX/MINBY/MAXBY
                return aggregate;
            }

            return tryToOptimize(scalar, aggregate, join);
        } catch (Throwable e) {
            log.warn("Failed to optimize aggregate: \n{}", GraphPrinter.toString(aggregate), e);
            return aggregate;
        }
    }

    private static SelectLocal tryToOptimize(Scalar scalar, AggregateLocal aggregate, JoinAllLocal join) {
        Expression key = aggregate.getKey();
        List<Expression> values = aggregate.getValues();

        ConditionAnalyzer.Condition condition = ConditionAnalyzer.analyzeCondition(key, join);
        Util.verify(!condition.left.isEmpty() && condition.right.isEmpty() && condition.mixed.isEmpty()
                && condition.constant.isEmpty(), "key does not come from left");

        Plan aggregateBySource = join.getRight();
        List<Expression> aggregateByKeys = join.getRightKeys();
        List<Expression> aggregateByValues = new ArrayList<>();
        Int2IntFunction mapping = column -> join.getMeta().getSchema().getColumn(column);

        for (Expression value : values) {
            condition = ConditionAnalyzer.analyzeCondition(value, join);
            Util.verify(condition.left.isEmpty() && condition.mixed.isEmpty(),
                    "value does not come from right");

            Expression reconnected = ConditionUtil.reconnectExpressions(value, join, aggregateBySource, mapping);
            aggregateByValues.add(reconnected);
        }

        AggregateByLocal aggregateBy = new AggregateByLocal(aggregateBySource, aggregateByKeys,
                List.of(new AggregateByLocal.Aggregation(aggregate.getType(), aggregateByValues)));

        List<Expression> aggregatedKeys = IntStream.range(0, aggregateByKeys.size())
                .mapToObj(i -> (Expression) new Get(aggregateBy, i)).toList();

        JoinSingleLocal joinBy = new JoinSingleLocal(join.getLeft(), aggregateBy,
                join.getLeftKeys(), aggregatedKeys);

        Expression joinedValue = new Get(joinBy, joinBy.getMeta().getSchema().size() - 1);
        joinedValue = fillMissing(scalar, aggregate.getType(), joinBy, joinedValue);

        return new SelectLocal(joinedValue);
    }

    private static JoinAllLocal source(AggregateLocal aggregate) {
        if (aggregate.getSource() instanceof JoinAllLocal source) {
            return source;
        }

        if (aggregate.getSource() instanceof SelectLocal select) {
            for (Expression expression : select.getExpressions()) {
                if (expression instanceof Get get && get.plan() instanceof JoinAllLocal join) {
                    return join;
                }
            }
        }

        return null;
    }

    private static Expression fillMissing(Scalar scalar, AggregateType type,
                                          JoinSingleLocal join, Expression value) {
        return switch (type) {
            case COUNT, COUNT_ALL, SUM: // fill the result with zero
                Get key = new Get(join, join.getMeta().getSchema().size() - 2); // last key to check for NA
                UnaryFunction missing = new UnaryFunction(key, UnaryFunction.Type.ISNA);
                Expand zero = new Expand(join, new Constant(scalar, 0));
                yield new If(missing, zero, value);
            default:
                yield value;
        };
    }
}