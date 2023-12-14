package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class PushDownExpandTest {

    @Test
    void testPushDownExpand() {
        RangeLocal range = new RangeLocal(new Constant(5));

        BinaryOperator three = new BinaryOperator(new Expand(range, new Constant(1)),
                new Expand(range, new Constant(2)), BinaryOperation.ADD);

        BinaryOperator one = new BinaryOperator(new Expand(range, new Constant("a")),
                new Expand(range, new Constant("a")), BinaryOperation.EQ);

        BinaryOperator two = new BinaryOperator(three, one, BinaryOperation.SUB);
        RangeLocal capture = new RangeLocal(two);

        Graph graph = new Graph();
        graph.add(capture);

        new PushDownExpand().apply(graph);
        new ConstantFolding().apply(graph);

        Expression actual = capture.getExpression(0);
        Assertions.assertTrue(new Expand(range, new Constant(2)).semanticEqual(actual, true));
    }
}