package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.extern.slf4j.Slf4j;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;

import static org.junit.jupiter.api.Assertions.assertInstanceOf;
import static org.junit.jupiter.api.Assertions.assertNotNull;

@Slf4j
class OptimizeFilterTest {

    @Test
    void testLeftFilterOptimization() {
        // table t1
        //   [f] = t2.Filter(@[r] > 3)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val leftRowNumber = new Get(cartesian, 0);
        val constant = new Expand(cartesian, new Constant(3));

        val condition = new BinaryOperator(leftRowNumber, constant, BinaryOperation.GT);

        val filter = new FilterLocal(cartesian, condition);

        val graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(filter));

        new OptimizeFilter().apply(graph);
        new Clean().apply(graph);

        GraphPrinter.print(graph);

        Plan optimizedCartesian = getNode(graph, CartesianLocal.class);

        assertNotNull(optimizedCartesian);
        assertInstanceOf(CartesianLocal.class, optimizedCartesian);
        assertInstanceOf(FilterLocal.class, ((CartesianLocal) optimizedCartesian).getLeft());
        assertInstanceOf(RangeLocal.class, ((CartesianLocal) optimizedCartesian).getRight());
    }

    @Test
    void testRightFilterOptimization() {
        // table t1
        //   [f] = t2.Filter($[r] <> 3)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val rightRowNumber = new Get(cartesian, 1);
        val constant = new Expand(cartesian, new Constant(3));

        val condition = new BinaryOperator(rightRowNumber, constant, BinaryOperation.NEQ);

        val filter = new FilterLocal(cartesian, condition);

        Graph graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(filter));

        new OptimizeFilter().apply(graph);
        new Clean().apply(graph);

        GraphPrinter.print(graph);

        Plan optimizedCartesian = getNode(graph, CartesianLocal.class);

        assertNotNull(optimizedCartesian);
        assertInstanceOf(CartesianLocal.class, optimizedCartesian);
        assertInstanceOf(FilterLocal.class, ((CartesianLocal) optimizedCartesian).getRight());
        assertInstanceOf(RangeLocal.class, ((CartesianLocal) optimizedCartesian).getLeft());
    }

    @Test
    void testJoinAllFilter() {
        // table t1
        //   [f] = t2.Filter($[r] = @[r])

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val leftRowNumber = new Get(cartesian, 0);
        val rightRowNum = new Get(cartesian, 1);

        val condition = new BinaryOperator(rightRowNum, leftRowNumber, BinaryOperation.EQ);

        val filter = new FilterLocal(cartesian, condition);

        val graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(filter));

        new OptimizeFilter().apply(graph);
        new Clean().apply(graph);

        GraphPrinter.print(graph);

        Plan joinAll = getNode(graph, JoinAllLocal.class);

        assertNotNull(joinAll);
        assertInstanceOf(JoinAllLocal.class, joinAll);
        assertInstanceOf(RangeLocal.class, ((JoinAllLocal) joinAll).getLeft());
        assertInstanceOf(RangeLocal.class, ((JoinAllLocal) joinAll).getRight());
    }

    @Test
    void testJoinAllFilter2() {
        // table t1
        //   [f] = t2.Filter($[r] + 3 = @[r] - 1)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val leftRowNumber = new Get(cartesian, 0);
        val leftConstant = new Expand(cartesian, new Constant(3));
        val leftCondition = new BinaryOperator(leftRowNumber, leftConstant, BinaryOperation.ADD);

        val rightRowNum = new Get(cartesian, 1);
        val rightConstant = new Expand(cartesian, new Constant(1));
        val rightCondition = new BinaryOperator(rightRowNum, rightConstant, BinaryOperation.SUB);

        val condition = new BinaryOperator(leftCondition, rightCondition, BinaryOperation.EQ);

        val filter = new FilterLocal(cartesian, condition);

        val graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(filter));

        new OptimizeFilter().apply(graph);
        new Clean().apply(graph);

        GraphPrinter.print(graph);

        Plan joinAll = getNode(graph, JoinAllLocal.class);

        assertNotNull(joinAll);
        assertInstanceOf(JoinAllLocal.class, joinAll);
        assertInstanceOf(RangeLocal.class, ((JoinAllLocal) joinAll).getLeft());
        assertInstanceOf(RangeLocal.class, ((JoinAllLocal) joinAll).getRight());
    }

    @Test
    void testFilterOptimization() {
        // table t1
        //   [f] = t2.Filter(1 = 1 and $[r] + 3 = @[r] - 1 and @[r] < 3 and $[r] > 1)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        // 1 = 1
        val constCondition = new BinaryOperator(
                new Expand(cartesian, new Constant(1)),
                new Expand(cartesian, new Constant(1)),
                BinaryOperation.EQ);

        val leftRowNumber = new Get(cartesian, 0);
        val leftConstant = new Expand(cartesian, new Constant(3));
        val leftCondition = new BinaryOperator(leftRowNumber, leftConstant, BinaryOperation.ADD);

        val rightRowNum = new Get(cartesian, 1);
        val rightConstant = new Expand(cartesian, new Constant(1));
        val rightCondition = new BinaryOperator(rightRowNum, rightConstant, BinaryOperation.SUB);

        // $[r] + 3 = @[r] - 1
        val joinCondition = new BinaryOperator(leftCondition, rightCondition, BinaryOperation.EQ);

        // @[r] < 3
        val leftPrefilter = new BinaryOperator(leftRowNumber, new Expand(cartesian, new Constant(3)),
                BinaryOperation.LT);

        // $[r] > 1
        val rightPreFilter =
                new BinaryOperator(rightRowNum, new Expand(cartesian, new Constant(1)), BinaryOperation.GT);

        // filter condition
        val condition = new BinaryOperator(
                new BinaryOperator(constCondition, joinCondition, BinaryOperation.AND),
                new BinaryOperator(leftPrefilter, rightPreFilter, BinaryOperation.AND),
                BinaryOperation.AND
        );

        val filter = new FilterLocal(cartesian, condition);

        val graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(filter));

        new OptimizeFilter().apply(graph);
        new Deduplicate().apply(graph);
        new Clean().apply(graph);

        GraphPrinter.print(graph);

        Plan joinAll = getNode(graph, JoinAllLocal.class);

        assertNotNull(joinAll);
        assertInstanceOf(JoinAllLocal.class, joinAll);
        assertInstanceOf(FilterLocal.class, ((JoinAllLocal) joinAll).getLeft());
        assertInstanceOf(FilterLocal.class, ((JoinAllLocal) joinAll).getRight());
    }

    @Test
    void testOptimizationWithProjections() {
        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);
        val rowNumber = new RowNumber(cartesian);
        val a = new BinaryOperator(new Get(cartesian, 0), new Expand(cartesian, new Constant(5)),
                BinaryOperation.ADD);
        val select = new SelectLocal(rowNumber);

        val leftProjection = columnProjection(select, cartesian, a, 0);
        val leftConstant = new Expand(cartesian, new Constant(3));
        val leftCondition = new BinaryOperator(leftProjection, leftConstant, BinaryOperation.ADD);

        val rightRowNum = new Get(cartesian, 1);
        val rightConstant = new Expand(cartesian, new Constant(1));
        val rightCondition = new BinaryOperator(rightRowNum, rightConstant, BinaryOperation.SUB);

        val condition = new BinaryOperator(leftCondition, rightCondition, BinaryOperation.EQ);

        val filter = new FilterLocal(cartesian, condition);

        val graph = new Graph();
        graph.add(RuleTestUtil.assignViewport(filter));

        log.info("Unoptimized graph:");
        GraphPrinter.print(graph);

        Set<Node> nodesBeforeOptimization = new HashSet<>(graph.getNodes());

        new OptimizeFilter().apply(graph);

        log.info("Optimized graph:");
        GraphPrinter.print(graph);

        Set<Node> nodesAfterOptimization = new HashSet<>(graph.getNodes());

        // assert that failed optimization does not lead to invalid graph state
        Assertions.assertIterableEquals(nodesBeforeOptimization, nodesAfterOptimization);
    }

    private static Expression columnProjection(Plan carry, Plan project, Expression column, int carryKey) {
        return new Projection(new Get(carry, carryKey), column);
    }


    private static Plan getNode(Graph graph, Class<?> clazz) {
        return (Plan) graph.getNodes()
                .stream()
                .filter(clazz::isInstance)
                .findFirst()
                .orElse(null);
    }
}
