package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

class FilterSparkTest extends SharedLocalSparkTest {

    @Test
    void testFilter() {
        val range1 = new RangeSpark(new Constant(5));
        val range2 = new RangeSpark(new Constant(2));
        val cartesian = new CartesianSpark(range1, range2);
        val cartesianResult = new ResultTestPlan(cartesian.execute().getDataset());

        val condition = new BinaryOperator(
                new Get(cartesianResult, 0),
                new Constant(3),
                BinaryOperation.LT
        );

        val filter = new FilterSpark(cartesianResult, condition);
        String path = basePath.resolve("filter").toString();
        val store = new StoreTableSpark(filter, path);

        Dataset<Row> result = store.execute().getDataset();

        verify(result,
                row(0.0, 0.0),
                row(0.0, 1.0),
                row(1.0, 0.0),
                row(1.0, 1.0),
                row(2.0, 0.0),
                row(2.0, 1.0)
        );
    }
}
