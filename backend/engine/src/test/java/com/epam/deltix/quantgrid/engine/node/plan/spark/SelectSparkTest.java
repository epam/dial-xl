package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

class SelectSparkTest extends SharedLocalSparkTest {

    @Test
    void testSelect() {
        TablePartition[] layout = {
                TablePartition.builder().index(0).startRow(0).endRow(2).build(),
                TablePartition.builder().index(1).startRow(3).endRow(5).build()
        };
        val layoutNode = new ResultTestPlan(layout);

        val rowNumber = new RowNumberSpark(layoutNode);
        val select0 = new SelectSpark(rowNumber, rowNumber, rowNumber);

        // create collisions
        val select = new SelectSpark(
                rowNumber, // _rn
                new Get(select0, 0), // _rn
                new Get(select0, 1), // _rn_1
                new Get(select0, 2) // _rn_2
        );

        SparkTable value = select.execute();
        Dataset<Row> dataset = value.getDataset();

        verify(dataset, """
                +---+-----+-------+-----+
                |0.0|0.0  |0.0    |0.0  |
                |1.0|1.0  |1.0    |1.0  |
                |2.0|2.0  |2.0    |2.0  |
                |3.0|3.0  |3.0    |3.0  |
                |4.0|4.0  |4.0    |4.0  |
                |5.0|5.0  |5.0    |5.0  |
                +---+-----+-------+-----+
                """);
    }
}