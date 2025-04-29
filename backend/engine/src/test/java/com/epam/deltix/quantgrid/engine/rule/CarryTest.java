package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.cache.EmptyCache;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.Projection;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.opentest4j.AssertionFailedError;

import java.util.List;

public class CarryTest {

    @Test
    void testOneChain() {
        val layout = new RangeLocal(new Constant(10));
        val a = new RowNumber(layout);
        val b = new Get(layout, 0);
        val c = new BinaryOperator(a, b, BinaryOperation.ADD);
        val d = new BinaryOperator(b, c, BinaryOperation.MUL);

        val select = new SelectLocal(a);
        val distinct = new DistinctByLocal(select, List.of(column(select, layout, b)));
        val sort = new OrderByLocal(distinct, List.of(column(distinct, layout, c)), new boolean[] {true});
        val condition = new BinaryOperator(column(sort, layout, d), column(sort, layout, b), BinaryOperation.LT);
        val filter = new FilterLocal(sort, condition);

        verify(filter);
    }

    @Test
    void testTwoChains() {
        val layout1 = new RangeLocal(new Constant(10));
        val a = new RowNumber(layout1);
        val b = new Get(layout1, 0);
        val select1 = new SelectLocal(new Get(new SelectLocal(a), 0));

        val layout2 = new DistinctByLocal(select1, List.of(column(select1, layout1, b)));
        val c = new RowNumber(layout2);
        val d = column(layout2, layout1, a);
        val e = new BinaryOperator(c, d, BinaryOperation.MUL);
        val select2 = new SelectLocal(c);
        val distinct = new DistinctByLocal(select2, List.of(column(select2, layout2, d), column(select2, layout2, e)));

        verify(distinct);
    }

    @Test
    void testChainSplit() {
        val layout = new RangeLocal(new Constant(10));
        val a = new RowNumber(layout);
        val b = new Get(layout, 0);
        val c = new BinaryOperator(a, b, BinaryOperation.ADD);
        val d = new BinaryOperator(b, c, BinaryOperation.MUL);

        val select = new SelectLocal(a);
        val distinct = new DistinctByLocal(select, List.of(column(select, layout, b)));
        val sort = new OrderByLocal(distinct, List.of(column(distinct, layout, c)), new boolean[] {true});
        val condition =
                new BinaryOperator(column(distinct, layout, d), column(distinct, layout, b), BinaryOperation.LT);
        val filter = new FilterLocal(distinct, condition);

        verify(sort, filter);
    }

    @Test
    void testChainMerge() {
        val layout = new RangeLocal(new Constant(10));
        val a = new RowNumber(layout);
        val b = new Get(layout, 0);
        val c = new BinaryOperator(a, b, BinaryOperation.ADD);
        val d = new BinaryOperator(b, c, BinaryOperation.MUL);

        val select = new SelectLocal(a);
        val join = new JoinAllLocal(select, select,
                List.of(column(select, layout, c)),
                List.of(column(select, layout, b)));
        val distinct = new DistinctByLocal(join, List.of(new Get(join, 1), column(join, layout, d, 1)));
        val sort = new OrderByLocal(distinct, List.of(column(distinct, layout, d, 0)), new boolean[] {true});

        verify(sort);
    }

    @Test
    void testFalseCycle() {
        val layout = new RangeLocal(new Constant(10));
        val a = new RowNumber(layout);
        val select = new SelectLocal(a);

        val join = new JoinAllLocal(select, select,
                List.of(column(select, layout, a)),
                List.of(column(select, layout, a)));
        val agg = new AggregateLocal(AggregateType.COUNT, layout, join, new Get(join, 0), new Get(join, 1));
        val b = new Get(agg, 0);

        val distinct = new DistinctByLocal(select, List.of(column(select, layout, b)));
        verify(distinct);
    }

    @Test
    void testTrueCycle() {
        val layout = new RangeLocal(new Constant(10));
        val a = new RowNumber(layout);
        val select = new SelectLocal(a);
        val join = new JoinAllLocal(select, select,
                List.of(column(select, layout, a)),
                List.of(column(select, layout, a)));

        val agg1 = new AggregateLocal(AggregateType.COUNT, layout, join, new Get(join, 0), new Get(join, 1));
        val b = new Get(agg1, 0);

        val agg2 = new AggregateLocal(AggregateType.SUM, layout, join, new Get(join, 1),
                column(join, layout, b, 1));
        val c = new Get(agg2, 0);

        Assertions.assertThrowsExactly(AssertionFailedError.class, () -> verify(b, c));
    }

    private static void verify(Node... sinks) {
        Graph graph = new Graph();

        for (Node sink : sinks) {
            graph.add(RuleTestUtil.assignViewport(sink));
        }

        new Deduplicate().apply(graph);
        new Clean().apply(graph);
        GraphPrinter.print(graph);

        new Duplicate().apply(graph);
        new Carry(EmptyCache.INSTANCE).apply(graph);
        new Deduplicate().apply(graph);
        GraphPrinter.print(graph);

        graph.visitOut(node -> Assertions.assertFalse(node instanceof Projection));
    }

    private static Expression column(Plan carry, Plan layout, Expression column) {
        return column(carry, layout, column, 0);
    }

    private static Expression column(Plan carry, Plan layout, Expression column, int carryKey) {
        return new Projection(new Get(carry, carryKey), column);
    }
}
