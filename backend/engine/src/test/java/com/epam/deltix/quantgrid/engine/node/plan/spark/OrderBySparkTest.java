package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

class OrderBySparkTest extends SharedLocalSparkTest {

    private Plan datasetNode;

    @BeforeAll
    void init() {
        StructType schema = StructType.fromDDL("rn DOUBLE, company STRING, date DOUBLE, value DOUBLE");
        List<Row> rows = List.of(
                row(3.0, "companyA", 1.0, 12.0),
                row(1.0, "companyA", 3.0, 22.0),
                row(6.0, "companyB", 1.0, 111.0),
                row(2.0, "companyA", 2.0, 11.0),
                row(5.0, "companyB", 2.0, 222.0),
                row(4.0, "companyB", 3.0, 223.0)
        );
        Dataset<Row> dataset = spark.createDataFrame(rows, schema).repartition(3);
        datasetNode = new ResultTestPlan(dataset);
    }

    @Test
    void testOrderBy() {
        // sort(company, date DESC)
        List<Expression> keys = List.of(new Get(datasetNode, 1), new Get(datasetNode, 2));
        boolean[] ascending = {true, false};

        val orderBy = new OrderBySpark(datasetNode, keys, ascending);
        SparkValue value = orderBy.execute();

        Dataset<Row> orderedDataset = value.getDataset();

        verify(orderedDataset, """
                +---+--------+----+-----+
                |1.0|companyA|3.0 |22.0 |
                |2.0|companyA|2.0 |11.0 |
                |3.0|companyA|1.0 |12.0 |
                |4.0|companyB|3.0 |223.0|
                |5.0|companyB|2.0 |222.0|
                |6.0|companyB|1.0 |111.0|
                +---+--------+----+-----+
                """);
    }
}