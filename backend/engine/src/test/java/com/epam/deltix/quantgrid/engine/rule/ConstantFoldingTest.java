package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

class ConstantFoldingTest {

    @Test
    void testConstantFolding() {
        BinaryOperator three = new BinaryOperator(
                new Constant(1), new Constant(2), BinaryOperation.ADD);

        BinaryOperator one = new BinaryOperator(
                new Constant("a"), new Constant("a"), BinaryOperation.EQ);

        BinaryOperator two = new BinaryOperator(three, one, BinaryOperation.SUB);
        RangeLocal range = new RangeLocal(two);

        Graph graph = new Graph();
        graph.add(range);

        Assertions.assertEquals(12, graph.getNodes().size());
        new ConstantFolding().apply(graph);

        Expression actual = range.getExpression(0);
        Assertions.assertTrue(new Constant(2).semanticEqual(actual, true));
    }
}