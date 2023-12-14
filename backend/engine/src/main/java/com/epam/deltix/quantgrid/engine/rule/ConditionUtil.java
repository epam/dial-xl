package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
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
            return new BinaryOperator(a, b, BinaryOperation.ADD);
        }
    }

    /**
     * Clone expression providing initial mapping from the original to the new source,
     * e.g. {@code Get(originalSource, 4) -> Get(newSource, 1)}
     */
    public Expression cloneExpressionAndConnectToSource(
            Expression currentNode,
            Plan originalSource,
            Plan newSource,
            Map<Node, Node> clonedExpressions) {
        return (Expression) cloneExpressionAndConnectToSource(
                currentNode, originalSource, newSource, clonedExpressions, Int2IntFunction.identity());
    }

    /**
     * Clone expression providing {@link Get} mapping from an original to a new index in the source,
     * e.g. Map(4 -> 1) means that Get(originalSource, 4) will be replaced with Get(newSource, 1).
     */
    public Expression cloneExpressionAndConnectToSource(
            Expression currentNode,
            Plan originalSource,
            Plan newSource,
            Int2IntFunction mapping) {
        return (Expression) cloneExpressionAndConnectToSource(
                currentNode, originalSource, newSource, new HashMap<>(), mapping);
    }

    /**
     * Clones expression subgraph starting at {@code currentNode} by reconnecting all its inputs from
     * an {@code originalSource} to a {@code newSource} plan.
     *
     * @param currentNode expression root
     * @param originalSource source node to reconnect from
     * @param newSource target node to reconnect to
     * @param clonedExpressions output map of cloned nodes used to avoid cloning same node twice
     * @param mapping might be used to remap Get expressions from original to new source
     * @return cloned expression root, or original {@code currentNode} if there is nothing to reconnect
     */
    private Node cloneExpressionAndConnectToSource(
            Node currentNode,
            Plan originalSource,
            Plan newSource,
            Map<Node, Node> clonedExpressions,
            Int2IntFunction mapping) {

        Node currentClone = clonedExpressions.get(currentNode);
        if (currentClone != null) {
            return currentClone;
        }

        if (currentNode == originalSource) {
            currentClone = newSource;
        } else if (currentNode instanceof Plan) {
            return currentNode;
        } else if (currentNode instanceof Get get && get.plan() == originalSource) {
            int newSourceColumn = mapping.get(get.getColumn());
            currentClone = new Get(newSource, newSourceColumn);
        } else if (currentNode instanceof Expand expand) {
            currentClone = new Expand(newSource, expand.getScalar());
        } else {
            boolean isSame = true;
            List<Node> clonedFanIns = new ArrayList<>(currentNode.getInputs().size());
            for (Node in : currentNode.getInputs()) {
                Node clone = cloneExpressionAndConnectToSource(
                        in, originalSource, newSource, clonedExpressions, mapping);

                isSame &= (clone == in);
                clonedFanIns.add(clone);
            }

            currentClone = isSame ? currentNode : currentNode.copy(clonedFanIns);
        }

        clonedExpressions.put(currentNode, currentClone);
        return currentClone;
    }
}
