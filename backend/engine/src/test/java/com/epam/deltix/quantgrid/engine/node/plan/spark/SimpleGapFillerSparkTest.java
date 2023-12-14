package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.val;
import org.apache.spark.scheduler.SparkListener;
import org.apache.spark.scheduler.SparkListenerJobStart;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.encoders.RowEncoder;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.field;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static org.assertj.core.api.Assertions.assertThat;

class SimpleGapFillerSparkTest extends SharedLocalSparkTest {

    private static final StructField PS_FIELD = field("ps", ColumnType.PERIOD_SERIES);
    private static final StructType SCHEMA = StructType.fromDDL("dbl DOUBLE, str STRING").add(PS_FIELD);

    @Test
    void testEmptySparkTable() {
        val jobCounter = new JobCounter();
        spark.sparkContext().addSparkListener(jobCounter);
        try {
            val emptyRange = new RangeSpark(new Constant(0));
            val gapFilled = new SimpleGapFillerSpark(emptyRange);
            Dataset<Row> dataset = gapFilled.execute().getDataset();

            assertThat(jobCounter.counter)
                    .as("Persisted input to `SimpleGapFillerSpark` should not generate any jobs for empty check")
                    .hasValue(0);
            verify(dataset, row(Double.NaN));
        } finally {
            spark.sparkContext().removeSparkListener(jobCounter);
        }
    }

    @Test
    void testNonEmptySparkTable() {
        val jobCounter = new JobCounter();
        spark.sparkContext().addSparkListener(jobCounter);
        try {
            val nonEmptyRange = new RangeSpark(new Constant(1));
            val gapFilled = new SimpleGapFillerSpark(nonEmptyRange);
            Dataset<Row> dataset = gapFilled.execute().getDataset();

            assertThat(jobCounter.counter)
                    .as("Persisted input to `SimpleGapFillerSpark` should not generate any jobs for empty check")
                    .hasValue(0);
            verify(dataset, row(0));
        } finally {
            spark.sparkContext().removeSparkListener(jobCounter);
        }
    }

    @Test
    void testEmptyDatasetTable() {
        Dataset<Row> emptyDataset = spark.emptyDataset(RowEncoder.apply(SCHEMA));
        val emptyDatasetPlan = new ResultTestPlan(emptyDataset);
        val gapFilled = new SimpleGapFillerSpark(emptyDatasetPlan);

        Dataset<Row> dataset = gapFilled.execute().getDataset();

        dataset.show(false);
        verify(dataset, """
                +---+----+----+
                |NaN|null|null|
                +---+----+----+
                """);
    }

    @Test
    void testNonEmptyDatasetTable() {
        Row psRow = row(123, Period.DAY.toString(), new double[] {1, 2, 3});
        List<Row> rows = List.of(row(1d, "Hello", psRow));
        Dataset<Row> dataset = spark.createDataFrame(rows, SCHEMA);

        val datasetPlan = new ResultTestPlan(dataset);
        val gapFilled = new SimpleGapFillerSpark(datasetPlan);
        Dataset<Row> resultDataset = gapFilled.execute().getDataset();

        assertThat(resultDataset).isSameAs(dataset);
    }

    private static class JobCounter extends SparkListener {
        @Getter
        private final AtomicInteger counter = new AtomicInteger();

        @Override
        public void onJobStart(SparkListenerJobStart jobStart) {
            counter.incrementAndGet();
        }
    }
}