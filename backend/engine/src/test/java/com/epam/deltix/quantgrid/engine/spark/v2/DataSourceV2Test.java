package com.epam.deltix.quantgrid.engine.spark.v2;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.spark.CartesianSpark;
import com.epam.deltix.quantgrid.engine.node.plan.spark.StoreTableSpark;
import com.epam.deltix.quantgrid.engine.spark.TablePartition;
import com.epam.deltix.quantgrid.engine.spark.TablePartition.ColumnPartition;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkTable;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.SneakyThrows;
import lombok.val;
import org.apache.hadoop.conf.Configuration;
import org.apache.hadoop.hive.ql.exec.vector.BytesColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.DoubleColumnVector;
import org.apache.hadoop.hive.ql.exec.vector.VectorizedRowBatch;
import org.apache.orc.OrcFile;
import org.apache.orc.Reader;
import org.apache.orc.RecordReader;
import org.apache.orc.TypeDescription;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.catalyst.expressions.GenericRow;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.nio.file.Path;
import java.util.Arrays;
import java.util.List;
import java.util.Objects;

import static org.apache.spark.sql.functions.col;
import static org.assertj.core.api.Assertions.assertThat;

class DataSourceV2Test extends SharedLocalSparkTest {

    public static final int NUM_PARTITIONS = 3;

    private StructType schema;
    private List<Row> rows;
    private Dataset<Row> dataset;
    private Plan datasetNode;

    @BeforeAll
    void init() {
        schema = StructType.fromDDL("_rn DOUBLE, company STRING, date DOUBLE, value DOUBLE");
        rows = List.of(
                new GenericRow(new Object[] {1.0, "cmpA", 1.0, Double.NaN}),
                new GenericRow(new Object[] {2.0, "cmpA", 1.0, 11.0}),
                new GenericRow(new Object[] {3.0, "cmpA", 2.0, 22.0}),
                new GenericRow(new Object[] {4.0, "companyB", 1.0, 111.0}),
                new GenericRow(new Object[] {5.0, null, 2.0, 222.0}),
                new GenericRow(new Object[] {6.0, "companyB", 2.0, 223.0})
        );
        dataset = spark.createDataFrame(rows, schema).repartition(NUM_PARTITIONS).cache();
        datasetNode = new ResultTestPlan(dataset);
    }

    @Test
    void getTable() {
        String testPath = basePath.resolve("testWriteRead").toString();

        // show initial dataset
        dataset.show(false);

        val store = new StoreTableSpark(datasetNode, testPath);
        SparkTable table = store.execute();
        TablePartition[] partitions = table.getPartitions();

        // print using a simple read helper
        printPartitions(partitions);

        // do a cartesian
        Plan select = new ResultTestPlan(partitions);
        val cartesian = new CartesianSpark(select, select);

        SparkValue cartesianExecuted = cartesian.execute();
        Dataset<Row> cartesianDs = cartesianExecuted.getDataset();

        String[] joinFields = cartesianDs.schema().fieldNames();

        List<String> companyColumns = Arrays.stream(joinFields).filter(n -> n.startsWith("company")).toList();
        String companyLeft = companyColumns.get(0);
        String companyRight = companyColumns.get(1);

        // add equi-join condition
        Dataset<Row> joinDs = cartesianDs.where(companyLeft + " = " + companyRight);

        // store join result
        Plan joinNode = new ResultTestPlan(joinDs);
        Path joinTable = basePath.resolve("joinTable");
        StoreTableSpark storeCross = new StoreTableSpark(joinNode, joinTable.toString());
        SparkTable storedCross = storeCross.execute();

        printPartitions(storedCross.getPartitions());

        Dataset<Row> crossDs = storedCross.getDataset();
        crossDs.show(false);

        int expectedTotalCount = 13;
        assertThat(crossDs.count()).isEqualTo(expectedTotalCount);

        assertCompanyColumns(companyLeft, companyRight, crossDs);
        assertDateColumns(joinFields, crossDs);
        assertValueColumns(joinFields, crossDs);
    }

    private static void assertCompanyColumns(
            String companyLeft, String companyRight, Dataset<Row> crossDs) {

        Dataset<Row> filteredCompany = crossDs.where(col(companyLeft).isNull().and(col(companyRight).isNull()));
        assertThat(filteredCompany.count()).isZero();
    }

    private static void assertDateColumns(String[] joinFields, Dataset<Row> crossDs) {
        List<String> dateColumns = Arrays.stream(joinFields).filter(n -> n.startsWith("date")).toList();
        String dateLeft = dateColumns.get(0);
        String dateRight = dateColumns.get(1);

        Dataset<Row> filteredDate = crossDs.where(col(dateLeft).isNaN().and(col(dateRight).isNaN()));
        assertThat(filteredDate.count()).isZero();
    }

    private static void assertValueColumns(String[] joinFields, Dataset<Row> crossDs) {
        List<String> valueColumns = Arrays.stream(joinFields).filter(n -> n.startsWith("value")).toList();
        String valueLeft = valueColumns.get(0);
        String valueRight = valueColumns.get(1);

        long expectedNanValues = 3;
        Dataset<Row> filteredValueLeft = crossDs.where(col(valueLeft).isNaN());
        Dataset<Row> filteredValueRight = crossDs.where(col(valueRight).isNaN());
        assertThat(filteredValueLeft.count())
                .isEqualTo(filteredValueRight.count())
                .isEqualTo(expectedNanValues);
    }

    private void printPartitions(TablePartition[] partitions) {
        for (TablePartition partition : partitions) {
            List<ColumnPartition> columns = partition.getColumns();
            for (ColumnPartition column : columns) {
                System.out.printf("Column (%s): %s%n", partition.getIndex(), column.getName());
                printColumn(column);
            }
        }
    }

    @SneakyThrows
    private void printColumn(ColumnPartition column) {
        Configuration conf = spark.sparkContext().hadoopConfiguration();
        TypeDescription schema = switch (column.getType()) {
            case DOUBLE, INTEGER, BOOLEAN, DATE -> TypeDescription.createDouble();
            case STRING -> TypeDescription.createString();
            case PERIOD_SERIES -> throw new IllegalArgumentException("not supported");
        };

        // .orcTail(); we can cache OrcTail to avoid reading footer
        OrcFile.ReaderOptions options = OrcFile.readerOptions(conf);

        String path = Objects.requireNonNull(column.getPath());
        try (Reader reader = OrcFile.createReader(new org.apache.hadoop.fs.Path(path), options)) {

            Reader.Options rowsOptions = reader.options().schema(schema);
            try (RecordReader rows = reader.rows(rowsOptions)) {

                VectorizedRowBatch batch = schema.createRowBatch(); // could be cached

                if (column.getType() == ColumnType.DOUBLE) {
                    while (rows.nextBatch(batch)) {
                        val col = (DoubleColumnVector) batch.cols[0];
                        for (int i = 0; i < batch.size; i++) {
                            System.out.println(col.vector[i]);
                        }
                    }
                } else {
                    while (rows.nextBatch(batch)) {
                        val col = (BytesColumnVector) batch.cols[0];
                        for (int i = 0; i < batch.size; i++) {
                            System.out.println(col.toString(i));
                        }
                    }
                }

            }
        }
    }

}
