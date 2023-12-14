package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkDoubleColumn;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class RangeSparkTest extends SharedLocalSparkTest {

    @Test
    void testRange() {
        int expectedCount = 11;

        val range = new RangeSpark(new Constant(expectedCount));
        val table = (SparkTable) range.execute();

        Dataset<Row> dataset = table.getDataset();
        assertThat(dataset.count()).isEqualTo(expectedCount);

        SparkDoubleColumn doubleColumn = table.getDoubleColumn(0);
        Dataset<Row> rowNumberDataset = doubleColumn.getDataset();
        assertThat(rowNumberDataset.count()).isEqualTo(expectedCount);

        List<Row> rangeRows = dataset.collectAsList();
        assertThat(rangeRows).hasSize(expectedCount);

        List<Row> rowNumberRows = rowNumberDataset.collectAsList();
        assertThat(rowNumberRows).hasSize(expectedCount);

        for (int i = 0; i < expectedCount; i++) {
            assertThat(rangeRows.get(i).getDouble(0)).isEqualTo(i);
            assertThat(rowNumberRows.get(i).getDouble(0)).isEqualTo(i);
        }
    }
}
