package com.epam.deltix.quantgrid.engine.node.plan.spark;

import com.epam.deltix.quantgrid.engine.node.ResultTestPlan;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.test.SharedLocalSparkTest;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.spark.SparkValue;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.util.Doubles;
import it.unimi.dsi.fastutil.doubles.DoubleArrayList;
import lombok.val;
import org.apache.spark.sql.Dataset;
import org.apache.spark.sql.Row;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;

class SimpleToPeriodSeriesSparkTest extends SharedLocalSparkTest {

    @Test
    void testSimpleToPeriodSeries() {
        val range = new RangeSpark(new Constant(5));
        val layout = new ResultTestPlan(range.execute().getDataset());

        val rowNumber = new Get(layout, 0);
        val timestamp =
                new BinaryOperator(rowNumber, new Expand(layout, new Constant(3)), BinaryOperation.ADD);
        val value =
                new BinaryOperator(rowNumber, new Expand(layout, new Constant(10)), BinaryOperation.MUL);

        /*
           rNum, timestamp, value
           0     3          0
           1     4          10
           2     5          20
           3     6          30
           4     7          40
         */
        Dataset<Row> select = ((SparkValue) layout.execute()).getDataset().withColumns(Map.of(
                "timestamp", timestamp.toSpark(),
                "value", value.toSpark()
        ));

        val table = new ResultTestPlan(select);

        val yearlyPs = new SimpleToPeriodSeriesSpark(new Scalar(), table, timestamp, value, Period.YEAR);
        Table yearlyResult = yearlyPs.execute();
        verify(yearlyResult.getPeriodSeriesColumn(0), new PeriodSeries(Period.YEAR, 0d, 40d));

        val dailyPs = new SimpleToPeriodSeriesSpark(new Scalar(), table, timestamp, value, Period.DAY);
        Table dailyResult = dailyPs.execute();
        verify(dailyResult.getPeriodSeriesColumn(0),
                new PeriodSeries(Period.DAY, 2d, 0d, 10d, 20d, 30d, 40d));
    }

    @Test
    void testEmptyDataset() {
        val range = new RangeSpark(new Constant(0));
        val layout = new ResultTestPlan(range.execute().getDataset());

        val rowNumber = new Get(layout, 0);
        val timestamp =
                new BinaryOperator(rowNumber, new Expand(layout, new Constant(3)), BinaryOperation.ADD);
        val value =
                new BinaryOperator(rowNumber, new Expand(layout, new Constant(10)), BinaryOperation.MUL);

        /*
           rNum, timestamp, value
                <empty>
         */
        Dataset<Row> select = ((SparkValue) layout.execute()).getDataset().withColumns(Map.of(
                "timestamp", timestamp.toSpark(),
                "value", value.toSpark()
        ));

        val table = new ResultTestPlan(select);

        val yearlyPs = new SimpleToPeriodSeriesSpark(new Scalar(), table, timestamp, value, Period.YEAR);
        Table yearlyResult = yearlyPs.execute();
        verify(yearlyResult.getPeriodSeriesColumn(0),
                new PeriodSeries(Period.YEAR, Doubles.ERROR_NA, DoubleArrayList.of()));
    }
}
