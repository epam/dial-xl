package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.test.TestAsserts;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static org.assertj.core.api.Assertions.assertThat;

class StorePeriodSeriesSparkTest extends SharedLocalSparkTest {

    @Test
    void testStorePeriodSeries() {
        StructType schema = new StructType(new StructField[] {
                TestAsserts.field("r_num", ColumnType.DOUBLE),
                TestAsserts.field("PS", ColumnType.PERIOD_SERIES),
        });

        List<Row> rows = List.of(
                row(0.0, row(105.0, Period.DAY.name(), new double[] {127.0, Doubles.ERROR_NA, 123})),
                row(1.0, row(106.0, Period.DAY.name(), new double[] {134.6})),
                row(2.0, null),
                row(3.0, row(108.0, Period.DAY.name(), new double[] {1})),
                row(4.0, null),
                row(5.0, row(109.0, Period.DAY.name(), new double[] {17.5, Doubles.ERROR_NA, Doubles.ERROR_NA, 10})),
                row(6.0, row(Doubles.ERROR_NA, Period.DAY.name(), new double[0]))
        );

        val psTable = new ResultTestPlan(spark.createDataFrame(rows, schema).repartition(3));

        String path = basePath.resolve("ps_table").toString();
        StoreTableSpark storeTable = new StoreTableSpark(psTable, path);

        SparkTable storedTable = storeTable.execute();

        TablePartition[] partitions = storedTable.getPartitions();
        StoreTableSparkTest.assertPartitions(partitions, schema.size(), 3, rows.size());

        Dataset<Row> datasetRead = storedTable.getDataset();
        assertThat(datasetRead.count()).isEqualTo(rows.size());

        datasetRead.show(false);

        verify(datasetRead, """
                +-----+------------------------------------+
                |0.0  |{105.0, DAY, [127.0, NaN, 123.0]}   |
                |6.0  |{105.0, DAY, []}                    |
                |1.0  |{106.0, DAY, [134.6]}               |
                |3.0  |{106.0, DAY, [1.0]}                 |
                |4.0  |null                                |
                |2.0  |null                                |
                |5.0  |{109.0, DAY, [17.5, NaN, NaN, 10.0]}|
                +-----+------------------------------------+
                """);
    }

    @Test
    void testStoreIdenticalPeriodSeries() {
        StructType schema = new StructType(new StructField[] {
                TestAsserts.field("r_num", ColumnType.DOUBLE),
                TestAsserts.field("PS", ColumnType.PERIOD_SERIES),
        });

        List<Row> rows = List.of(
                row(0.0, row(105.0, Period.DAY.name(), new double[] {127.0})),
                row(1.0, row(105.0, Period.DAY.name(), new double[] {127.0})),
                row(2.0, row(105.0, Period.DAY.name(), new double[] {127.0})),
                row(3.0, row(105.0, Period.DAY.name(), new double[] {127.0})),
                row(4.0, row(105.0, Period.DAY.name(), new double[] {127.0})),
                row(5.0, row(105.0, Period.DAY.name(), new double[] {127.0}))
        );

        val psTable = new ResultTestPlan(spark.createDataFrame(rows, schema).repartition(3));

        String path = basePath.resolve("identical_ps_table").toString();
        StoreTableSpark storeTable = new StoreTableSpark(psTable, path);

        SparkTable storedTable = storeTable.execute();

        TablePartition[] partitions = storedTable.getPartitions();
        StoreTableSparkTest.assertPartitions(partitions, schema.size(), 3, rows.size());

        Dataset<Row> datasetRead = storedTable.getDataset();
        assertThat(datasetRead.count()).isEqualTo(rows.size());

        datasetRead.show(false);

        verify(datasetRead, """
                +-----+---------------------+
                |1.0  |{105.0, DAY, [127.0]}|
                |5.0  |{105.0, DAY, [127.0]}|
                |0.0  |{105.0, DAY, [127.0]}|
                |2.0  |{105.0, DAY, [127.0]}|
                |3.0  |{105.0, DAY, [127.0]}|
                |4.0  |{105.0, DAY, [127.0]}|
                +-----+---------------------+
                                       """);
    }

    @Test
    void testStoreEmptyPeriodSeries() {
        StructType schema = new StructType(new StructField[] {
                TestAsserts.field("r_num", ColumnType.DOUBLE),
                TestAsserts.field("PS", ColumnType.PERIOD_SERIES),
        });

        List<Row> rows = List.of();

        val psTable = new ResultTestPlan(spark.createDataFrame(rows, schema));

        String path = basePath.resolve("empty_ps_table").toString();
        StoreTableSpark storeTable = new StoreTableSpark(psTable, path);

        SparkTable storedTable = storeTable.execute();

        TablePartition[] partitions = storedTable.getPartitions();
        StoreTableSparkTest.assertPartitions(partitions, schema.size(), 1, 0);

        Dataset<Row> datasetRead = storedTable.getDataset();
        assertThat(datasetRead.count()).isZero();
    }
}
