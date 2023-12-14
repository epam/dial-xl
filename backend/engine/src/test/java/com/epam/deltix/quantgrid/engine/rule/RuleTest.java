package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.val;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

public class RuleTest {

    @Test
    void testDeduplicate(){
        val add1 = new BinaryOperator(new Constant(5), new Constant(10), BinaryOperation.ADD);
        val sub1 = new BinaryOperator(new Constant(5), add1, BinaryOperation.SUB);

        val add2 = new BinaryOperator(new Constant(5), new Constant(10), BinaryOperation.ADD);
        val sub2 = new BinaryOperator(new Constant(5), add2, BinaryOperation.SUB);

        val graph = new Graph();
        graph.add(sub1);
        graph.add(sub2);

        Assertions.assertEquals(16, graph.getNodes().size());

        new Deduplicate().apply(graph);
        Assertions.assertEquals(5, graph.getNodes().size());
    }
}
