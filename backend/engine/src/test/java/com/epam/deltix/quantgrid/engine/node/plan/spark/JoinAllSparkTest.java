package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.field;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

class JoinAllSparkTest extends SharedLocalSparkTest {

    protected Dataset<Row> left;
    protected ResultTestPlan leftValue;
    protected Dataset<Row> right;
    protected ResultTestPlan rightValue;

    @BeforeAll
    void init() {
        StructField psField = field("ps", ColumnType.PERIOD_SERIES);
        StructType leftSchema = StructType.fromDDL("rn DOUBLE, s STRING").add(psField);
        List<Row> leftRows = List.of(
                row(0.0, "s0", row(103.0, Period.DAY.toString(), new double[] {3, 3})),
                row(1.0, "s1", row(104.0, Period.DAY.toString(), new double[] {4, 4})),
                row(2.0, "s2", row(105.0, Period.DAY.toString(), new double[] {5, 5})),
                row(3.0, "s3", row(106.0, Period.DAY.toString(), new double[] {6, 7})));
        left = spark.createDataFrame(leftRows, leftSchema);
        leftValue = new ResultTestPlan(left);

        StructType rightSchema = StructType.fromDDL("rn DOUBLE, rn_query DOUBLE, s STRING").add(psField);
        List<Row> rightRows = List.of(
                row(0.0, 5.0, "s05", row(203.0, Period.MONTH.toString(), new double[] {50, 50})),
                row(0.0, 6.0, "s06", row(Doubles.ERROR_NA, Period.MONTH.toString(), new double[] {})),
                row(0.0, 7.0, "s07", null),
                row(2.0, 9.0, "s99", row(206.0, Period.MONTH.toString(), new double[] {91, 92})));
        right = spark.createDataFrame(rightRows, rightSchema);
        rightValue = new ResultTestPlan(right);
    }

    @Test
    void testInnerJoin() {
        val join = new JoinAllSpark(
                leftValue, List.of(new Get(leftValue, 0)),
                rightValue, List.of(new Get(rightValue, 0))
        );
        Dataset<Row> result = join.execute().getDataset();

        // |rn_l|s_l|rn_r|ps_l|rn_query_r|s_r|ps_r|
        verify(result, """
                +----+---+------------------------+----+----------+---+----------------------------+
                |0.0 |s0 |{103.0, DAY, [3.0, 3.0]}|0.0 |5.0       |s05|{203.0, MONTH, [50.0, 50.0]}|
                |0.0 |s0 |{103.0, DAY, [3.0, 3.0]}|0.0 |6.0       |s06|{NaN, MONTH, []}            |
                |0.0 |s0 |{103.0, DAY, [3.0, 3.0]}|0.0 |7.0       |s07|null                        |
                |2.0 |s2 |{105.0, DAY, [5.0, 5.0]}|2.0 |9.0       |s99|{206.0, MONTH, [91.0, 92.0]}|
                +----+---+------------------------+----+----------+---+----------------------------+
                """
        );
    }

    @Test
    void testLeftJoin() {
        val join = new JoinAllSpark(
                leftValue, List.of(new Get(leftValue, 0)),
                rightValue, List.of(new Get(rightValue, 0)),
                JoinAllSpark.JoinType.LEFT
        );
        verifyLeftJoin(join);
    }

    protected static void verifyLeftJoin(JoinAllSpark join) {
        Dataset<Row> result = join.execute().getDataset();

        // |rn_l|s_l|ps_l|rn_r|rn_query_r|s_r|ps_r|
        verify(result, """
                +----+---+------------------------+----+----------+----+----------------------------+
                |0.0 |s0 |{103.0, DAY, [3.0, 3.0]}|0.0 |7.0       |s07 |null                        |
                |0.0 |s0 |{103.0, DAY, [3.0, 3.0]}|0.0 |6.0       |s06 |{NaN, MONTH, []}            |
                |0.0 |s0 |{103.0, DAY, [3.0, 3.0]}|0.0 |5.0       |s05 |{203.0, MONTH, [50.0, 50.0]}|
                |1.0 |s1 |{104.0, DAY, [4.0, 4.0]}|NaN |NaN       |null|null                        |
                |2.0 |s2 |{105.0, DAY, [5.0, 5.0]}|2.0 |9.0       |s99 |{206.0, MONTH, [91.0, 92.0]}|
                |3.0 |s3 |{106.0, DAY, [6.0, 7.0]}|NaN |NaN       |null|null                        |
                +----+---+------------------------+----+----------+----+----------------------------+
                """
        );
    }

}
