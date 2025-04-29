package com.epam.deltix.quantgrid.engine.rule;

import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.val;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

class ConditionAnalyzerTest {

    @Test
    void testLeftKindCondition() {
        // table t1
        //   [f] = t2.Filter(@[r] > 3)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val leftRowNumber = new Get(cartesian, 0);
        val constant = new Expand(cartesian, new Constant(3));

        val condition = new BinaryOperator(leftRowNumber, constant, BinaryOperation.GT);

        ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        assertThat(conditions.left).containsExactly(condition);
        assertThat(conditions.right).isEmpty();
        assertThat(conditions.constant).isEmpty();
        assertThat(conditions.mixed).isEmpty();
    }

    @Test
    void testRightKindCondition() {
        // table t1
        //   [f] = t2.Filter($[r] <> 3)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val rightRowNumber = new Get(cartesian, 1);
        val constant = new Expand(cartesian, new Constant(3));

        val condition = new BinaryOperator(rightRowNumber, constant, BinaryOperation.NEQ);

        ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        assertThat(conditions.right).containsExactly(condition);
        assertThat(conditions.left).isEmpty();
        assertThat(conditions.constant).isEmpty();
        assertThat(conditions.mixed).isEmpty();
    }

    @Test
    void testConstantKindCondition() {
        // table t1
        //   [f] = t2.Filter(1 < 3)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val constant1 = new Expand(cartesian, new Constant(1));
        val constant2 = new Expand(cartesian, new Constant(3));

        val condition = new BinaryOperator(constant1, constant2, BinaryOperation.LT);

        ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        assertThat(conditions.constant).containsExactly(condition);
        assertThat(conditions.right).isEmpty();
        assertThat(conditions.left).isEmpty();
        assertThat(conditions.mixed).isEmpty();
    }

    @Test
    void testEqualityKindCondition() {
        // table t1
        //   [f] = t2.Filter($[r] = @[r])

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val leftRowNumber = new Get(cartesian, 0);
        val rightRowNum = new Get(cartesian, 1);

        val condition = new BinaryOperator(rightRowNum, leftRowNumber, BinaryOperation.EQ);

        ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        assertThat(conditions.mixed).containsExactly(condition);
        assertThat(conditions.right).isEmpty();
        assertThat(conditions.constant).isEmpty();
        assertThat(conditions.left).isEmpty();

        ConditionAnalyzer.MixedCondition mixedGroup =
                ConditionAnalyzer.analyzeMixedConditions(conditions.mixed, cartesian);

        assertThat(mixedGroup.eq.size()).isEqualTo(1);
        assertTrue(condition.swapOperands().semanticEqual(mixedGroup.eq.get(0), true));
        assertThat(mixedGroup.other).isEmpty();
    }

    @Test
    void testEqualityKindCondition2() {
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

        ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        assertThat(conditions.mixed).containsExactly(condition);
        assertThat(conditions.right).isEmpty();
        assertThat(conditions.constant).isEmpty();
        assertThat(conditions.left).isEmpty();

        ConditionAnalyzer.MixedCondition mixedGroup =
                ConditionAnalyzer.analyzeMixedConditions(conditions.mixed, cartesian);

        assertThat(mixedGroup.eq.size()).isEqualTo(1);
        assertThat(mixedGroup.eq.get(0)).isEqualTo(condition);
        assertThat(mixedGroup.other).isEmpty();
    }

    @Test
    void testNotOptimizedKindCondition() {
        // table t1
        //   [f] = t2.Filter($[r] + 3 >= @[r] - 1)

        val t1 = new RangeLocal(new Constant(5));
        val t2 = new RangeLocal(new Constant(10));

        val cartesian = new CartesianLocal(t1, t2);

        val leftRowNumber = new Get(cartesian, 0);
        val leftConstant = new Expand(cartesian, new Constant(3));
        val leftCondition = new BinaryOperator(leftRowNumber, leftConstant, BinaryOperation.ADD);

        val rightRowNum = new Get(cartesian, 1);
        val rightConstant = new Expand(cartesian, new Constant(1));
        val rightCondition = new BinaryOperator(rightRowNum, rightConstant, BinaryOperation.SUB);

        val condition = new BinaryOperator(leftCondition, rightCondition, BinaryOperation.GTE);

        ConditionAnalyzer.Condition conditions = ConditionAnalyzer.analyzeCondition(condition, cartesian);

        assertThat(conditions.mixed).containsExactly(condition);
        assertThat(conditions.right).isEmpty();
        assertThat(conditions.constant).isEmpty();
        assertThat(conditions.left).isEmpty();

        ConditionAnalyzer.MixedCondition mixedGroup =
                ConditionAnalyzer.analyzeMixedConditions(conditions.mixed, cartesian);

        assertThat(mixedGroup.other.size()).isEqualTo(1);
        assertThat(mixedGroup.other.get(0)).isEqualTo(condition);
        assertThat(mixedGroup.eq).isEmpty();
    }
}
