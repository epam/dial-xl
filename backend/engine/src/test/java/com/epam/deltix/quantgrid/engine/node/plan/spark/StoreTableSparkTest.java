package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.spark.PartitionUtil;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.partitioning.RowNumRepartition;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.execution.ExtendedMode;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static org.apache.spark.sql.functions.col;
import static org.apache.spark.sql.functions.lit;
import static org.apache.spark.sql.functions.spark_partition_id;
import static org.assertj.core.api.Assertions.assertThat;

class StoreTableSparkTest extends SharedLocalSparkTest {

    public static final int NUM_PARTITIONS = 3;

    private StructType schema;
    private Dataset<Row> dataset;
    private Plan datasetNode;

    @BeforeAll
    void init() {
        schema = StructType.fromDDL("ref DOUBLE, company STRING, date DOUBLE, value DOUBLE");
        List<Row> rows = List.of(
                row(1.0, "cmpA", 1.0, Double.NaN),
                row(2.0, "cmpA", 1.0, 11.0),
                row(3.0, "cmpA", 2.0, 22.0),
                row(4.0, "companyB", 1.0, 111.0),
                row(5.0, null, 2.0, 222.0),
                row(6.0, "companyB", 2.0, 223.0)
        );
        dataset = spark.createDataFrame(rows, schema).repartition(NUM_PARTITIONS).cache();
        datasetNode = new ResultTestPlan(dataset);
    }

    @Test
    void testStoreIncrementTable() {
        SparkTable layoutTable = storeAndValidate(dataset.collectAsList(), datasetNode, NUM_PARTITIONS);
        TablePartition[] layoutParts = layoutTable.getPartitions();

        String rnName = "_rn";
        StructType incrementSchema = StructType.fromDDL(rnName + " DOUBLE, sector STRING, newValue DOUBLE");
        List<Row> increment = List.of(
                row(0.0, "finance1", Double.NaN),
                row(1.0, "fin2", 11.0),
                row(2.0, "fin3", 22.0),
                row(3.0, "fina4", 111.0),
                row(4.0, null, 222.0),
                row(5.0, "f6", 223.0)
        );
        Dataset<Row> inrementDataset = spark.createDataFrame(increment, incrementSchema)
                .repartition(NUM_PARTITIONS + 1).cache();

        long[] endRows = PartitionUtil.ranges(layoutParts);
        val repartition = new RowNumRepartition(inrementDataset.col(rnName), endRows);

        Dataset<Row> alignedIncrement = inrementDataset
                .transform(repartition::apply)
                .sortWithinPartitions(col(rnName));

        alignedIncrement.explain(ExtendedMode.name());

        String incrementPath = basePath.resolve("incrementDataset").toString();
        TablePartition[] incrementParts = StoreTableSpark.save(alignedIncrement, incrementPath);

        // validate partition boundaries
        assertThat(layoutParts).hasSize(incrementParts.length);
        for (int i = 0; i < layoutParts.length; i++) {
            TablePartition layoutPart = layoutParts[i];
            TablePartition incrementPart = incrementParts[i];

            assertThat(layoutPart.getIndex()).isEqualTo(incrementPart.getIndex());
            assertThat(layoutPart.getStartRow()).isEqualTo(incrementPart.getStartRow());
            assertThat(layoutPart.getEndRow()).isEqualTo(incrementPart.getEndRow());
        }

        val layoutPlan = new ResultTestPlan(layoutParts);
        val incrementPlan = new ResultTestPlan(incrementParts);
        SelectSpark selectSpark = new SelectSpark(
                new RowNumberSpark(layoutPlan),
                new Get(layoutPlan, 1),
                new Get(layoutPlan, 2),
                new Get(incrementPlan, 0),
                new Get(incrementPlan, 1),
                new Get(incrementPlan, 2)
        );
        SparkTable selectTable = selectSpark.execute();
        Dataset<Row> selectedDs = selectTable.getDataset();

        verify(selectedDs, """
                +---+--------+----+-----+--------+--------+
                |0.0|cmpA    |1.0 |0.0  |finance1|NaN     |
                |1.0|null    |2.0 |1.0  |fin2    |11.0    |
                |2.0|cmpA    |1.0 |2.0  |fin3    |22.0    |
                |3.0|companyB|1.0 |3.0  |fina4   |111.0   |
                |4.0|cmpA    |2.0 |4.0  |null    |222.0   |
                |5.0|companyB|2.0 |5.0  |f6      |223.0   |
                +---+--------+----+-----+--------+--------+
                """);
    }

    @Test
    void testStoreTable() {
        storeAndValidate(dataset.collectAsList(), datasetNode, NUM_PARTITIONS);
    }

    @Test
    void testStorePartiallyFilteredTable() {
        int numPartitions = 1; // only records with partitionId=2 are preserved
        Dataset<Row> filteredDataset = dataset.where(spark_partition_id().equalTo(lit(2)));

        List<Row> filteredRows = filteredDataset.collectAsList();
        val datasetNode = new ResultTestPlan(filteredDataset);

        storeAndValidate(filteredRows, datasetNode, numPartitions);
    }

    @Test
    void testStoreFilteredTable() {
        Dataset<Row> emptyDataset = dataset.where("ref > 100");
        storeAndValidateEmpty(emptyDataset);
    }

    @Test
    void testStoreEmptyTable() {
        Dataset<Row> emptyDataset = spark.createDataFrame(List.of(), schema);
        storeAndValidateEmpty(emptyDataset);
    }

    private SparkTable storeAndValidate(List<Row> rows, Plan datasetNode, int numPartitions) {
        String testPath = basePath.resolve("testWriteRead").toString();
        val store = new StoreTableSpark(datasetNode, testPath);
        SparkTable table = store.execute();

        TablePartition[] partitions = table.getPartitions();
        assertPartitions(partitions, schema.size(), numPartitions, rows.size());

        Dataset<Row> datasetRead = table.getDataset();
        assertThat(datasetRead.count()).isEqualTo(rows.size());

        verify(datasetRead, rows);

        return table;
    }

    private void storeAndValidateEmpty(Dataset<Row> emptyDataset) {
        String testPath = basePath.resolve("testWriteRead").toString();
        val emptyNode = new ResultTestPlan(emptyDataset);
        val store = new StoreTableSpark(emptyNode, testPath);
        SparkTable table = store.execute();

        TablePartition[] partitions = table.getPartitions();
        assertPartitions(partitions, schema.size(), 1, 0);

        Dataset<Row> datasetRead = table.getDataset();
        assertThat(datasetRead.count()).isZero();

        List<Row> rowsRead = datasetRead.collectAsList();
        assertThat(rowsRead).isEmpty();
    }

    static void assertPartitions(
            TablePartition[] partitions,
            int expectedColumns,
            int expectedPartitions,
            int expectedCount) {

        assertThat(partitions).hasSize(expectedPartitions);
        assertThat(partitions[0].getStartRow()).isZero();

        int lastIndex = partitions.length - 1;

        for (int i = 0; i < lastIndex; i++) {
            TablePartition partition = partitions[i];
            assertThat(partition.getIndex()).isEqualTo(i);
            assertThat(partition.colCount()).isEqualTo(expectedColumns);
            assertThat(partition.getEndRow()).isEqualTo(partitions[i + 1].getStartRow() - 1);
        }

        TablePartition last = partitions[lastIndex];
        assertThat(last.getIndex()).isEqualTo(lastIndex);
        assertThat(last.colCount()).isEqualTo(expectedColumns);
        assertThat(last.getEndRow()).isEqualTo(expectedCount - 1);
    }
}