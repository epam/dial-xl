package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.Table;
import lombok.val;
import org.junit.jupiter.api.Test;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static com.epam.deltix.quantgrid.engine.test.TestExecutor.execute;
import static org.assertj.core.api.Assertions.assertThat;

class SimpleAggregateSparkTest extends SharedLocalSparkTest {

    @Test
    void testSingleColumn() {
        val range = new RangeSpark(new Constant(7));
        val count = new SimpleAggregateSpark(new Scalar(), range, AggregateFunction.COUNT);
        val sum = new SimpleAggregateSpark(new Scalar(), range, AggregateFunction.SUM);

        val select = new SelectLocal(
                new Get(count, 0),
                new Get(sum, 0)
        );
        Table result = execute(select);
        assertThat(result.getColumnCount()).isEqualTo(2);
        verify(result.getDoubleColumn(0), 7);
        verify(result.getDoubleColumn(1), 21);
    }

    @Test
    void testMultipleColumns() {
        val range1 = new RangeSpark(new Constant(3));
        val range2 = new RangeSpark(new Constant(3));
        val cartesian = new CartesianSpark(range1, range2);
        val count = new SimpleAggregateSpark(new Scalar(), cartesian, AggregateFunction.COUNT);
        val sum = new SimpleAggregateSpark(new Scalar(), cartesian, AggregateFunction.SUM);

        val select = new SelectLocal(
                new Get(count, 0),
                new Get(sum, 0)
        );
        Table result = execute(select);
        assertThat(result.getColumnCount()).isEqualTo(2);
        verify(result.getDoubleColumn(0), 9);
        verify(result.getDoubleColumn(1), 18);
    }

    @Test
    void testEmptyDataset() {
        val range = new RangeSpark(new Constant(0));
        val count = new SimpleAggregateSpark(new Scalar(), range, AggregateFunction.COUNT);
        val sum = new SimpleAggregateSpark(new Scalar(), range, AggregateFunction.SUM);

        val select = new SelectLocal(
                new Get(count, 0),
                new Get(sum, 0)
        );
        Table result = execute(select);
        assertThat(result.getColumnCount()).isEqualTo(2);
        verify(result.getDoubleColumn(0), 0);
        verify(result.getDoubleColumn(1), 0);
    }
}