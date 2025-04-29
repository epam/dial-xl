package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.test.TestExecutor;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import it.unimi.dsi.fastutil.ints.Int2IntFunction;
import lombok.val;
import org.junit.jupiter.api.Test;

import java.util.HashMap;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static com.epam.deltix.quantgrid.engine.test.TestInputs.CPI_CSV;
import static org.assertj.core.api.Assertions.assertThat;

class ConditionUtilTest {

    @Test
    void testCloneWithMapping() {
        InputLocal inputLocal = TestInputs.createLocalInput(CPI_CSV);

        val enrichedSource = new SelectLocal(
                new RowNumber(inputLocal),
                new Get(inputLocal, 4)
        );

        // relies on inputLocal
        val expression = new BinaryOperator(
                new Get(inputLocal, 4),
                new Expand(inputLocal, new Constant("A")),
                BinaryOperation.EQ
        );

        // remap Get column 4 from inputLocal to column 1 in enrichedSource while cloning
        Int2IntFunction mapping = getIndex -> (getIndex == 4) ? 1 : getIndex;

        // clones expression and remaps to the enrichedSource from inputLocal
        Expression newExpression = ConditionUtil.reconnectExpressions(
                expression, inputLocal, enrichedSource, mapping);

        verifyClone(expression, inputLocal, enrichedSource, newExpression);
    }

    @Test
    void testCloneWithNodeMap() {
        InputLocal inputLocal = TestInputs.createLocalInput(CPI_CSV);

        val getFreq = new Get(inputLocal, 4);
        val enrichedSource = new SelectLocal(
                new RowNumber(inputLocal),
                getFreq
        );

        // relies on inputLocal
        val expression = new BinaryOperator(
                getFreq,
                new Expand(inputLocal, new Constant("A")),
                BinaryOperation.EQ
        );

        // provide explicit node remapping
        HashMap<Node, Node> clonedExpressions = new HashMap<>();
        val getFreqNew = new Get(enrichedSource, 1);
        clonedExpressions.put(getFreq, getFreqNew);

        // clones expression and remaps to the enrichedSource from inputLocal
        Expression newExpression = ConditionUtil.reconnectExpressions(
                expression, inputLocal, enrichedSource, clonedExpressions);

        verifyClone(expression, inputLocal, enrichedSource, newExpression);
    }

    private static void verifyClone(Expression expression,
                                    InputLocal inputLocal,
                                    SelectLocal enrichedSource,
                                    Expression newExpression) {

        assertThat(newExpression).isNotSameAs(expression);
        assertThat(NodeUtil.depends(newExpression, enrichedSource)).isTrue();
        assertThat(!NodeUtil.depends(newExpression, inputLocal)).isFalse();

        val newFilter = new FilterLocal(enrichedSource, newExpression);

        Table execute = TestExecutor.execute(newFilter);
        verify(execute.getDoubleColumn(0), 0, 1, 2);
        verify(execute.getStringColumn(1), "A", "A", "A");
    }
}