package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.expression.Get;
import lombok.val;
import org.junit.jupiter.api.Test;

class GapFillerJoinSparkTest extends JoinAllSparkTest {

    @Test
    void testGapFillerJoin() {
        val join = new GapFillerJoinSpark(
                leftValue, new Get(leftValue, 0),
                rightValue, new Get(rightValue, 0)
        );
        verifyLeftJoin(join);
    }
}