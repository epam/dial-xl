package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import org.apache.spark.sql.Column;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.apache.spark.sql.functions.col;
import static org.assertj.core.api.Assertions.assertThat;

class CartesianSparkTest extends SharedLocalSparkTest {

    @Test
    void testCartesian() {
        int expectedCount = 6;
        RangeSpark range = new RangeSpark(new Constant(expectedCount));
        CartesianSpark cartesianSpark = new CartesianSpark(range, range);
        SparkValue cartesian = cartesianSpark.execute();

        Dataset<Row> dataset = cartesian.getDataset();
        StructType schema = dataset.schema();

        String first = schema.fields()[0].name();
        String second = schema.fields()[1].name();

        // l__rn = r__rn
        Column col = col(first);
        Column col1 = col(second);
        Column condition = col.equalTo(col1);
        Dataset<Row> filtered = dataset.where(condition);

        filtered.explain();
        filtered.show(false);

        List<Row> rows = filtered.orderBy(first).collectAsList();
        assertThat(rows).hasSize(expectedCount);

        for (int i = 0; i < expectedCount; i++) {
            Row row = rows.get(i);
            assertThat(row.getDouble(0)).isEqualTo(i);
            assertThat(row.getDouble(1)).isEqualTo(i);
        }
    }
}