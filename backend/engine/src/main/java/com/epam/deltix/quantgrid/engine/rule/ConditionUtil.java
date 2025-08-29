package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import it.unimi.dsi.fastutil.ints.Int2IntFunction;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@UtilityClass
public class ConditionUtil {

    /**
     * Assemble given conditions with "AND" conjunction.
     * It uses dichotomy to build a condition with logarithmic tree-height. It is better for a following reasons:
     * - It's more amicable for parallel execution
     * - It looks more compact when graph is printed
     */
    public Expression assembleCondition(List<Expression> conditions) {
        return assembleCondition(conditions, 0, conditions.size() - 1);
    }

    private Expression assembleCondition(List<Expression> conditions, int l, int r) {
        if (l == r) {
            return conditions.get(l);
        } else {
            int m = (l + r) / 2;
            Expression a = assembleCondition(conditions, l, m);
            Expression b = assembleCondition(conditions, m + 1, r);
            return new BinaryOperator(a, b, BinaryOperation.AND);
        }
    }

    /**
     * Clone expression providing initial mapping from the original to the new source,
     * e.g. {@code Get(original, 4) -> Get(replacement, 1)}
     */
    public Expression reconnectExpressions(
            Expression node,
            Plan original,
            Plan replacement,
            Map<Node, Node> expressions) {
        return (Expression) reconnectExpressions(node, original, replacement, expressions, Int2IntFunction.identity());
    }

    /**
     * Clone expression providing {@link Get} mapping from an original to a new index in the source,
     * e.g. Map(4 -> 1) means that Get(original, 4) will be replaced with Get(newSource, 1).
     */
    public Expression reconnectExpressions(
            Expression node,
            Plan original,
            Plan replacement,
            Int2IntFunction mapping) {
        return (Expression) reconnectExpressions(node, original, replacement, new HashMap<>(), mapping);
    }

    /**
     * Clones expression subgraph starting at {@code node} by reconnecting all its inputs from
     * an {@code original} to a {@code replacement} plan.
     *
     * @param node expression root
     * @param original source node to reconnect from
     * @param replacement target node to reconnect to
     * @param expressions output map of cloned nodes used to avoid cloning same node twice
     * @param mapping might be used to remap Get expressions from original to new source
     * @return cloned expression root, or original {@code node} if there is nothing to reconnect
     */
    private Node reconnectExpressions(
            Node node,
            Plan original,
            Plan replacement,
            Map<Node, Node> expressions,
            Int2IntFunction mapping) {

        Node clone = expressions.get(node);
        if (clone != null) {
            return clone;
        }

        if (node == original) {
            clone = replacement;
        } else if (node instanceof Plan) {
            return node;
        } else if (node instanceof Get get) {
            while (true) {
                if (get.plan() == original) {
                    int newSourceColumn = mapping.get(get.getColumn());
                    clone = new Get(replacement, newSourceColumn);
                    break;
                }

                if (get.plan() instanceof SelectLocal select && select.getExpression(get.getColumn()) instanceof Get next) {
                    get = next;
                    continue;
                }

                throw new IllegalStateException("Cannot reconnect: Get");
            }
        } else if (node instanceof Expand expand) {
            clone = new Expand(replacement, expand.getScalar());
        } else if (node instanceof Projection projection) {
             Expression key = (Expression) reconnectExpressions(projection.getKey() ,original, replacement,
                     expressions, mapping);
            clone = new Projection(key, projection.getValue());
        } else if (node instanceof RowNumber){
            throw new IllegalArgumentException("Cannot reconnect: RowNumber");
        } else {
            List<Node> clonedIns = new ArrayList<>(node.getInputs().size());
            for (Node in : node.getInputs()) {
                Node copy = reconnectExpressions(in, original, replacement, expressions, mapping);
                if (in == copy) {
                    throw new IllegalStateException("Cannot reconnect: " + in.getClass().getSimpleName());
                }
                clonedIns.add(copy);
            }
            clone = node.copy(clonedIns, false);
        }

        expressions.put(node, clone);
        return clone;
    }
}
