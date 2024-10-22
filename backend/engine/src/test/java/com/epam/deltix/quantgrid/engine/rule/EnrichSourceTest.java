package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.ExpressionWithPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.test.TestExecutor;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Test;

import java.util.ArrayDeque;
import java.util.HashSet;
import java.util.List;
import java.util.Set;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static com.epam.deltix.quantgrid.engine.test.TestInputs.CPI_CSV;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.fail;

@Slf4j
class EnrichSourceTest {

    @Test
    void testFilter() {
        InputLocal inputLocal = TestInputs.createLocalInput(CPI_CSV);

        val sourceRowNumber = new RowNumber(inputLocal);
        val source = new SelectLocal(sourceRowNumber);

        val filter = new FilterLocal(source,
                // depends on inputLocal, rather than source
                new BinaryOperator(
                        new BinaryOperator(
                                new Get(inputLocal, 4), new Expand(inputLocal, new Constant("A")),
                                BinaryOperation.EQ
                        ),
                        new BinaryOperator(
                                sourceRowNumber, new Expand(source, new Constant(0)),
                                BinaryOperation.GT
                        ),
                        BinaryOperation.AND
                )
        );

        Graph graph = enrichSource(filter);

        SelectLocal select = findResultPlan(graph);
        FilterLocal newFilter = findSourcePlan(select);
        verifySource(newFilter.getCondition(), newFilter.getPlan());

        Table execute = TestExecutor.execute(select);
        verify(execute.getDoubleColumn(0), 1, 2);
    }

    @Test
    void testDistinctBy() {
        InputLocal inputLocal = TestInputs.createLocalInput(CPI_CSV);

        val source = new SelectLocal(
                new RowNumber(inputLocal)
        );

        val distinct = new DistinctByLocal(
                source,
                List.of(
                        new Get(inputLocal, 4),
                        new Get(inputLocal, 1),
                        new Get(inputLocal, 3)
                )
        );

        Graph graph = enrichSource(distinct);

        SelectLocal select = findResultPlan(graph);
        DistinctByLocal newDistinct = findSourcePlan(select);

        Plan newSource = newDistinct.getPlan();
        List<Expression> newKeys = newDistinct.expressions(0);
        for (Expression newKey : newKeys) {
            verifySource(newKey, newSource);
        }

        Table execute = TestExecutor.execute(select);
        verify(execute.getDoubleColumn(0), 0, 3);
    }

    @Test
    void testNestedAggregation() {
        val range = new RangeLocal(new Constant(7));
        val constants = new Expand(range, new Constant(1));
        val numbers = new Get(range, 0);
        val values = new BinaryOperator(numbers, constants, BinaryOperation.ADD);
        val left = new SelectLocal(numbers, values);
        val right = new SelectLocal(numbers, numbers);

        // passing values directly, not by using Get(left, 1)
        val join = new JoinAllLocal(left, right, List.of(values), List.of(numbers));

        Graph graph = enrichSource(join);

        JoinAllLocal newJoin = findResultPlan(graph);

        List<Expression> leftKeys = newJoin.expressions(0);
        Plan leftPlan = newJoin.getLeft();
        for (Expression leftKey : leftKeys) {
            verifySource(leftKey, leftPlan);
        }

        List<Expression> rightKeys = newJoin.expressions(1);
        Plan rightPlan = newJoin.getRight();
        for (Expression expression : rightKeys) {
            verifySource(expression, rightPlan);
        }

        Table result = TestExecutor.execute(newJoin);

        verify(result.getDoubleColumn(0), 1, 2, 3, 4, 5, 6);
        verify(result.getDoubleColumn(1), 2, 3, 4, 5, 6, 7);
        verify(result.getDoubleColumn(2), 2, 3, 4, 5, 6, 7);
        verify(result.getDoubleColumn(3), 2, 3, 4, 5, 6, 7);
    }

    private static Graph enrichSource(Plan originalPlan) {
        val graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(originalPlan));

        GraphPrinter.print("Initial graph", graph);
        new EnrichSource().apply(graph);
        GraphPrinter.print("Enriched graph", graph);

        Plan resultNode = findResultPlan(graph);
        int newSize = resultNode.getMeta().getSchema().size();
        int originalSize = originalPlan.getMeta().getSchema().size();
        assertThat(newSize)
                .as("Result node should not change number of columns")
                .isEqualTo(originalSize);

        return graph;
    }

    @SuppressWarnings("unckecked")
    private static <T extends Plan> T findResultPlan(Graph graph) {
        ViewportLocal viewPort = findViewport(graph);
        Expression viewPortExpression = viewPort.getExpression(0);
        Util.verify(viewPortExpression instanceof Get, "Unexpected viewport expression: ",
                viewPortExpression.getClass().getSimpleName());
        return (T) ((Get) viewPortExpression).plan();
    }

    private static ViewportLocal findViewport(Graph graph) {
        List<ViewportLocal> viewPorts = graph.getNodes().stream()
                .filter(n -> n instanceof ViewportLocal)
                .map(ViewportLocal.class::cast)
                .toList();

        Util.verify(viewPorts.size() == 1, "Expect 1 node to have result but %d found".formatted(viewPorts.size()));
        return viewPorts.get(0);
    }

    @SuppressWarnings("unchecked")
    private static <T extends Plan> T findSourcePlan(SelectLocal select) {
        return (T) ((Get) select.getExpressions().get(0)).plan();
    }

    private static void verifySource(Expression expression, Plan expectedSource) {
        Set<Node> visited = new HashSet<>();
        ArrayDeque<Node> queue = new ArrayDeque<>();

        visited.add(expression);
        queue.add(expression);

        while (!queue.isEmpty()) {
            Node node = queue.poll();

            if (node instanceof Get get && get.plan() != expectedSource) {
                fail("Found %s that has %s as a source, but should have %s",
                        get, get.plan(), expectedSource);
            }

            if (node instanceof Expand expand && expand.plan() != expectedSource) {
                fail("Found %s that has %s as a source, but should have %s",
                        expand, expand.plan(), expectedSource);
            }

            if (node instanceof RowNumber rowNumber) {
                fail("Found %s, but it should have been replaced with Get from %s",
                        rowNumber, expectedSource);
            }

            if (node instanceof ExpressionWithPlan<?, ?>) {
                // do not cross boundaries of the expression sub-graph
                continue;
            }

            for (Node input : node.getInputs()) {
                if (visited.add(input)) {
                    queue.add(input);
                }
            }
        }
    }
}