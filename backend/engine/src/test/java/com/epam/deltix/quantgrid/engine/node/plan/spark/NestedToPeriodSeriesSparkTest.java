package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.Period;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

class NestedToPeriodSeriesSparkTest extends SharedLocalSparkTest {

    @Test
    void testNestedToPeriodSeries() {
        val range = new RangeSpark(new Constant(3));

        StructType schema = StructType.fromDDL("rn_l DOUBLE, rn_r DOUBLE, timestamp DOUBLE, value DOUBLE");
        List<Row> rows = List.of(
                row(0.0, 0.0, 1.0, 12.0),
                row(0.0, 1.0, 5.0, 11.0),
                row(1.0, 0.0, 2.0, 22.0),
                row(1.0, 1.0, 1.0, 111.0),
                row(2.0, 0.0, 7.0, 222.0),
                row(2.0, 1.0, 8.0, 223.0)
        );

        val cartesian = new ResultTestPlan(spark.createDataFrame(rows, schema).repartition(3));

        val periodSeries = new NestedToPeriodSeriesSpark(range, cartesian,
                new Get(cartesian, 0), new Get(cartesian, 2), new Get(cartesian, 3),
                Period.DAY);

        Dataset<Row> aggregated = periodSeries.execute().getDataset();
        aggregated.show(false);

        verify(aggregated,
                // offset, period, values
                """
                        +---------------------------------------+
                        |{0.0, DAY, [12.0, NaN, NaN, NaN, 11.0]}|
                        |{0.0, DAY, [111.0, 22.0]}              |
                        |{6.0, DAY, [222.0, 223.0]}             |
                        +---------------------------------------+
                        """
        );
    }

    @Test
    void testNestedToPeriodSeriesWithGaps() {
        val range = new RangeSpark(new Constant(5));

        StructType schema = StructType.fromDDL("rn_l DOUBLE, rn_r DOUBLE, timestamp DOUBLE, value DOUBLE");
        List<Row> rows = List.of(
                row(0.0, 0.0, 1.0, 12.0),
                row(1.0, 0.0, 2.0, 22.0),
                row(1.0, 1.0, 1.0, 111.0),
                row(4.0, 0.0, 7.0, 222.0),
                row(2.0, 1.0, 8.0, 223.0),
                row(2.0, 3.0, 10.0, 223.0)
        );

        val cartesian = new ResultTestPlan(spark.createDataFrame(rows, schema).repartition(3));

        val periodSeries = new NestedToPeriodSeriesSpark(range, cartesian,
                new Get(cartesian, 0), new Get(cartesian, 2), new Get(cartesian, 3),
                Period.DAY);

        Dataset<Row> aggregated = periodSeries.execute().getDataset();
        aggregated.show(false);

        verify(aggregated,
                // offset, period, values
                """
                        +-------------------------------+
                        |{0.0, DAY, [12.0]}             |
                        |{0.0, DAY, [111.0, 22.0]}      |
                        |{7.0, DAY, [223.0, NaN, 223.0]}|
                        |null                           |
                        |{6.0, DAY, [222.0]}            |
                        +-------------------------------+
                        """
        );
    }

}
