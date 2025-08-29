package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.local.aggregate.AggregateType;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.functions;
import org.apache.spark.sql.types.DataTypes;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static org.assertj.core.api.Assertions.assertThat;

class NestedAggregateSparkTest extends SharedLocalSparkTest {

    @Test
    void testNestedCountAndSum() {
        val range = new RangeSpark(new Constant(7));

        // Get and the source should use the same instance of the Dataset to be able to find the column
        val cartesianExec = new ResultTestPlan(new CartesianSpark(range, range).execute().getDataset());

        val count = new NestedAggregateSpark(range, cartesianExec,
                new Get(cartesianExec, 0), List.of(), AggregateType.COUNT);
        val storeCount = new StoreTableSpark(count, basePath.resolve("count").toString());

        val sum = new NestedAggregateSpark(range, cartesianExec,
                new Get(cartesianExec, 0), List.of(new Get(cartesianExec, 1)), AggregateType.SUM);
        val storeSum = new StoreTableSpark(sum, basePath.resolve("sum").toString());

        val select = new SelectSpark(
                new RowNumberSpark(range),
                new Get(storeCount, 0),
                new Get(storeSum, 0)
        );

        Dataset<Row> aggs = select.execute().getDataset();
        aggs.show(false);

        List<Row> rows = aggs.collectAsList();
        assertThat(rows).hasSize(7);
        for (int i = 0; i < rows.size(); i++) {
            Row row = rows.get(i);
            assertThat(row.getDouble(0)).as("RowNumber").isEqualTo(i);
            assertThat(row.getDouble(1)).as("count").isEqualTo(7);
            assertThat(row.getDouble(2)).as("sum").isEqualTo(21);
        }
    }

    @Test
    void testAggregationWithGaps() {
        String rnL = "rn_l";
        Dataset<Row> currentTable = spark.range(0, 10).toDF(rnL)
                .select(functions.col(rnL).cast(DataTypes.DoubleType))
                .repartition(3);

        String rnR = "rn_r";
        Dataset<Row> queryTable = spark.range(5, 9).toDF(rnR)
                .select(functions.col(rnR).cast(DataTypes.DoubleType))
                .repartition(2);

        // store current table, which defines the layout of the data
        val r1Plan = new ResultTestPlan(currentTable);
        SparkTable r1Stored = new StoreTableSpark(r1Plan, basePath.resolve("layout").toString()).execute();
        val r1StoredPlan = new ResultTestPlan(r1Stored.getPartitions());

        Dataset<Row> r1Dataset = r1Stored.getDataset();

        // We join on  'rn_l > rn_r'.
        // It means that there are multiple gaps: 0,1,2,3,4,5 current row numbers do not have any
        // corresponding values in query table as a result they are not present in the resulting Dataset
        Dataset<Row> r12 = r1Dataset.join(queryTable, r1Dataset.col(rnL).gt(queryTable.col(rnR)));

        // `Get` and the `source` for aggragations should use the same instance of the Dataset
        // to be able to find the column
        ResultTestPlan r12Plan = new ResultTestPlan(r12);

        // Compute `count` and `sum` of query rows for each current row.
        // There are gaps (no matching query rows) for current rows [0, 5]

        // count(*)
        val count = new NestedAggregateSpark(r1StoredPlan, r12Plan,
                new Get(r12Plan, 0), List.of(), AggregateType.COUNT);
        count.execute().getDataset().explain();
        val storeCount = new StoreTableSpark(count, basePath.resolve("count").toString());

        // sum("rn_r")
        val sum = new NestedAggregateSpark(r1StoredPlan, r12Plan,
                new Get(r12Plan, 0), List.of(new Get(r12Plan, 1)), AggregateType.SUM);
        sum.execute().getDataset().explain();
        val storeSum = new StoreTableSpark(sum, basePath.resolve("sum").toString());

        // select row number, together with aggregates
        val aggregates = new SelectSpark(
                new RowNumberSpark(r1StoredPlan),
                new Get(storeCount, 0),
                new Get(storeSum, 0)
        );
        Dataset<Row> aggregatesDs = aggregates.execute().getDataset();

        // check that gaps are filled with 0 for current rows [0, 5]
        verify(aggregatesDs,
                // _rn, count, sum
                row(0.0, 0.0, 0),
                row(1.0, 0.0, 0),
                row(2.0, 0.0, 0),
                row(3.0, 0.0, 0),
                row(4.0, 0.0, 0),
                row(5.0, 0.0, 0),
                row(6.0, 1.0, 5),
                row(7.0, 2.0, 11.0),
                row(8.0, 3.0, 18.0),
                row(9.0, 4.0, 26.0));
    }
}
