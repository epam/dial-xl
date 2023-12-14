package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.ps.Extrapolate;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PercentChange;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.test.TestAsserts;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.apache.spark.sql.types.StructField;
import org.apache.spark.sql.types.StructType;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.row;
import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

public class PeriodSeriesFunctionSparkTest extends SharedLocalSparkTest {

    @Test
    void testExtrapolate() {
        StructType schema = new StructType(new StructField[] {
                TestAsserts.field("r_num", ColumnType.DOUBLE),
                TestAsserts.field("PS", ColumnType.PERIOD_SERIES),
        });

        List<Row> rows = List.of(
                row(0.0, row(105.0, Period.DAY.name(), new double[] {127.0, Double.NaN, 123})),
                row(1.0, row(106.0, Period.DAY.name(), new double[] {134.6})),
                row(2.0, null),
                row(3.0, row(108.0, Period.DAY.name(), new double[] {1})),
                row(4.0, null),
                row(5.0, row(109.0, Period.DAY.name(), new double[] {17.5, Double.NaN, Double.NaN, 10})),
                row(6.0, row(Double.NaN, Period.DAY.name(), new double[0]))
        );

        val psTable = new ResultTestPlan(spark.createDataFrame(rows, schema).repartition(3));

        Extrapolate extrapolate = new Extrapolate(new Get(psTable, 1));

        Dataset<Row> ds = ((SparkValue) psTable.execute()).getDataset()
                .withColumns(Map.of("extrapolate", extrapolate.toSpark()));

        verify(ds, // rn, original ps, extrapolate
                """
                        +-----+------------------------------------+--------------------------------------+
                        |0.0  |{105.0, DAY, [127.0, NaN, 123.0]}   |{105.0, DAY, [127.0, 127.0, 123.0]}   |
                        |5.0  |{109.0, DAY, [17.5, NaN, NaN, 10.0]}|{109.0, DAY, [17.5, 17.5, 17.5, 10.0]}|
                        |1.0  |{106.0, DAY, [134.6]}               |{106.0, DAY, [134.6]}                 |
                        |3.0  |{108.0, DAY, [1.0]}                 |{108.0, DAY, [1.0]}                   |
                        |4.0  |null                                |null                                  |
                        |2.0  |null                                |null                                  |
                        |6.0  |{NaN, DAY, []}                      |{NaN, DAY, []}                        |
                        +-----+------------------------------------+--------------------------------------+
                        """);
    }

    @Test
    void testPercentChange() {
        StructType schema = new StructType(new StructField[] {
                TestAsserts.field("r_num", ColumnType.DOUBLE),
                TestAsserts.field("PS", ColumnType.PERIOD_SERIES),
        });

        List<Row> rows = List.of(
                row(0.0, row(105.0, Period.YEAR.name(), new double[] {2, 2, 8, 16})),
                row(1.0, row(106.0, Period.YEAR.name(), new double[] {5, 10, 20, 40})),
                row(2.0, null),
                row(3.0, row(108.0, Period.YEAR.name(), new double[] {40, 20, 10})),
                row(4.0, null),
                row(5.0, row(109.0, Period.YEAR.name(), new double[] {17.5})),
                row(6.0, row(Double.NaN, Period.YEAR.name(), new double[0]))
        );

        val psTable = new ResultTestPlan(spark.createDataFrame(rows, schema).repartition(3));

        PercentChange extrapolate = new PercentChange(new Get(psTable, 1));

        Dataset<Row> ds = ((SparkValue) psTable.execute()).getDataset()
                .withColumns(Map.of("percentChange", extrapolate.toSpark()));

        verify(ds, // rn, original ps, percent change
                """
                        +-----+--------------------------------------+------------------------------------+
                        |0.0  |{105.0, YEAR, [2.0, 2.0, 8.0, 16.0]}  |{106.0, YEAR, [0.0, 300.0, 100.0]}  |
                        |6.0  |{NaN, YEAR, []}                       |{NaN, YEAR, []}                     |
                        |1.0  |{106.0, YEAR, [5.0, 10.0, 20.0, 40.0]}|{107.0, YEAR, [100.0, 100.0, 100.0]}|
                        |3.0  |{108.0, YEAR, [40.0, 20.0, 10.0]}     |{109.0, YEAR, [-50.0, -50.0]}       |
                        |4.0  |null                                  |null                                |
                        |2.0  |null                                  |null                                |
                        |5.0  |{109.0, YEAR, [17.5]}                 |{NaN, YEAR, []}                     |
                        +-----+--------------------------------------+------------------------------------+
                        """);
    }
}
