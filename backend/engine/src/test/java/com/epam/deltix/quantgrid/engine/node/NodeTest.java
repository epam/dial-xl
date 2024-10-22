package com.epam.deltix.quantgrid.engine.node;

import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Get;
import com.epam.deltix.quantgrid.engine.node.expression.Overrides;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.expression.ps.Extrapolate;
import com.epam.deltix.quantgrid.engine.node.expression.ps.PercentChange;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.AggregateFunction;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.DistinctByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.GapFillerJoinLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.InputLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinSingleLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.NestedAggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.NestedPivotLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.OrderByLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.PivotNamesLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SelectLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimpleAggregateLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimplePivotLocal;
import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.LocalInputProvider;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.DoubleColumn;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.engine.value.local.DoubleDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.PeriodSeriesDirectColumn;
import com.epam.deltix.quantgrid.engine.value.local.StringDirectColumn;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Dates;
import lombok.val;
import org.junit.jupiter.api.Test;

import java.util.List;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static com.epam.deltix.quantgrid.engine.test.TestExecutor.execute;
import static com.epam.deltix.quantgrid.engine.test.TestExecutor.executeError;
import static com.epam.deltix.quantgrid.engine.test.TestInputs.CPI_CSV;
import static com.epam.deltix.quantgrid.engine.test.TestInputs.INPUTS_PATH;
import static org.assertj.core.api.Assertions.assertThat;

class NodeTest {

    @Test
    void testRange() {
        RangeLocal range = new RangeLocal(new Constant(10));
        DoubleColumn result = execute(range).getDoubleColumn(0);
        verify(result, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
    }

    @Test
    void testDoubleMath() {
        RangeLocal range = new RangeLocal(new Constant(10));
        Expand constants = new Expand(range, new Constant(10));
        Get numbers = new Get(range, 0);
        BinaryOperator sum = new BinaryOperator(numbers, constants, BinaryOperation.ADD);

        DoubleColumn result = execute(sum).getDoubleColumn(0);
        verify(result, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20);
    }

    @Test
    void testCartesian() {
        RangeLocal range1 = new RangeLocal(new Constant(4));
        RangeLocal range2 = new RangeLocal(new Constant(5));
        CartesianLocal cartesian = new CartesianLocal(range1, range2);

        Table result = execute(cartesian);
        verify(result.getDoubleColumn(0), 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 3, 3, 3, 3, 3, 4, 4, 4, 4, 4);
        verify(result.getDoubleColumn(1), 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5, 1, 2, 3, 4, 5);
    }

    @Test
    void testFilter() {
        RangeLocal range = new RangeLocal(new Constant(10));
        Expand constants = new Expand(range, new Constant(5));
        Get numbers = new Get(range, 0);
        BinaryOperator conditions = new BinaryOperator(numbers, constants, BinaryOperation.LT);
        FilterLocal filter = new FilterLocal(range, conditions);

        Table result = execute(filter);
        verify(result.getDoubleColumn(0), 1, 2, 3, 4);
    }

    @Test
    void testDistinctBy() {
        RangeLocal range = new RangeLocal(new Constant(10));
        Expand constants = new Expand(range, new Constant(6));
        Get numbers = new Get(range, 0);
        BinaryOperator values = new BinaryOperator(numbers, constants, BinaryOperation.LT);
        SelectLocal select = new SelectLocal(numbers, values);
        DistinctByLocal distinct = new DistinctByLocal(select, List.of(new Get(select, 1)));

        Table result = execute(distinct);
        verify(result.getDoubleColumn(0), 1, 6);
        verify(result.getDoubleColumn(1), 1, 0);
    }

    @Test
    void testOrderBy() {
        RangeLocal range = new RangeLocal(new Constant(10));
        Expand constants = new Expand(range, new Constant(6));
        Get numbers = new Get(range, 0);
        BinaryOperator values = new BinaryOperator(numbers, constants, BinaryOperation.LT);
        SelectLocal select = new SelectLocal(numbers, values);
        OrderByLocal order = new OrderByLocal(select,
                List.of(new Get(select, 1), new Get(select, 0)), new boolean[] {true, false});

        Table result = execute(order);
        verify(result.getDoubleColumn(0), 10, 9, 8, 7, 6, 5, 4, 3, 2, 1);
        verify(result.getDoubleColumn(1), 0, 0, 0, 0, 0, 1, 1, 1, 1, 1);
    }

    @Test
    void testJoinAll() {
        RangeLocal range = new RangeLocal(new Constant(7));
        Expand constants = new Expand(range, new Constant(1));
        Get numbers = new Get(range, 0);
        BinaryOperator values = new BinaryOperator(numbers, constants, BinaryOperation.ADD);
        SelectLocal left = new SelectLocal(numbers, values);
        SelectLocal right = new SelectLocal(numbers, numbers);
        JoinAllLocal join = new JoinAllLocal(left, right, List.of(new Get(left, 1)), List.of(new Get(right, 1)));

        Table result = execute(join);
        verify(result.getDoubleColumn(0), 1, 2, 3, 4, 5, 6);
        verify(result.getDoubleColumn(1), 2, 3, 4, 5, 6, 7);
        verify(result.getDoubleColumn(2), 2, 3, 4, 5, 6, 7);
        verify(result.getDoubleColumn(3), 2, 3, 4, 5, 6, 7);
    }

    @Test
    void testJoinSingle() {
        // left (current) table
        RangeLocal leftRange = new RangeLocal(new Constant(4));
        Get leftNumber = new Get(leftRange, 0);
        BinaryOperator leftValue =
                new BinaryOperator(leftNumber, new Expand(leftRange, new Constant(5)),
                        BinaryOperation.ADD);
        // 0 1 2 3
        // 5 6 7 8
        SelectLocal leftTable = new SelectLocal(leftNumber, leftValue);
        // right (query) table
        RangeLocal rightRange = new RangeLocal(new Constant(10));
        Get rightNumber = new Get(rightRange, 0);
        BinaryOperator rightValue =
                new BinaryOperator(rightNumber, new Expand(rightRange, new Constant(3)),
                        BinaryOperation.SUB);

        // 0  1  2 3 4 5 6 7 8 9
        //-3 -2 -1 0 1 2 3 4 5 6
        SelectLocal rightTable = new SelectLocal(rightNumber, rightValue);
        JoinSingleLocal join = new JoinSingleLocal(leftTable, rightTable,
                List.of(new Get(leftTable, 1)), List.of(new Get(rightTable, 1)));

        Table result = execute(join);
        verify(result.getDoubleColumn(0), 1, 2, 3, 4);
        verify(result.getDoubleColumn(1), 6, 7, 8, 9);
        verify(result.getDoubleColumn(2), 9, 10, Doubles.ERROR_NA, Doubles.ERROR_NA);
        verify(result.getDoubleColumn(3), 6, 7, Doubles.ERROR_NA, Doubles.ERROR_NA);
    }

    @Test
    void testSimpleAggregation() {
        RangeLocal range = new RangeLocal(new Constant(7));
        SimpleAggregateLocal count = new SimpleAggregateLocal(AggregateFunction.COUNT_ALL, new Scalar(), range, new Get(range, 0));
        SimpleAggregateLocal sum = new SimpleAggregateLocal(AggregateFunction.SUM, new Scalar(), range,
                new Get(range, 0));
        SelectLocal select = new SelectLocal(new Get(count, 0), new Get(sum, 0));

        Table result = execute(select);
        verify(result.getDoubleColumn(0), 7);
        verify(result.getDoubleColumn(1), 28);
    }

    @Test
    void testNestedAggregation() {
        RangeLocal range = new RangeLocal(new Constant(7));
        SelectLocal current = new SelectLocal(new RowNumber(range));
        CartesianLocal cartesian = new CartesianLocal(current, range);
        NestedAggregateLocal count = new NestedAggregateLocal(AggregateFunction.COUNT_ALL, range, cartesian,
                new Get(cartesian, 0), new Get(cartesian, 1));
        NestedAggregateLocal sum = new NestedAggregateLocal(AggregateFunction.SUM, range, cartesian,
                new Get(cartesian, 0), new Get(cartesian, 1));
        SelectLocal select = new SelectLocal(new Get(count, 0), new Get(sum, 0));

        Table result = execute(select);
        verify(result.getDoubleColumn(0), 7, 7, 7, 7, 7, 7, 7);
        verify(result.getDoubleColumn(1), 28, 28, 28, 28, 28, 28, 28);
    }

    @Test
    void testSimpleToPeriodSeries() {
        Plan table = table(
                new DoubleDirectColumn(
                        Dates.of(2001, 1, 1),
                        Dates.of(2002, 5, 15),
                        Dates.of(2005, 12, 31)
                ),
                new DoubleDirectColumn(1, 2, 3)
        );

        SimpleAggregateLocal aggregate = new SimpleAggregateLocal(AggregateFunction.PERIOD_SERIES, new Scalar(), table,
                new Get(table, 0), new Get(table, 1), new Expand(table, new Constant("YEAR")));
        Table result = execute(aggregate);

        verify(result.getPeriodSeriesColumn(0), new PeriodSeries(Period.YEAR, 101, 1, 2, Doubles.ERROR_NA, Doubles.ERROR_NA, 3));
    }

    @Test
    void testNestedToPeriodSeries() {
        RangeLocal layout = new RangeLocal(new Constant(5));
        Plan table = table(
                new DoubleDirectColumn(1, 1, 3, 3),
                new DoubleDirectColumn(
                        Dates.of(2001, 1, 1),
                        Dates.of(2003, 5, 15),
                        Dates.of(2005, 12, 31),
                        Dates.of(2008, 1, 1)
                ),
                new DoubleDirectColumn(1, 2, 3, 4)
        );

        NestedAggregateLocal aggregate = new NestedAggregateLocal(AggregateFunction.PERIOD_SERIES, layout, table,
                new Get(table, 0), new Get(table, 1), new Get(table, 2),
                new Expand(table, new Constant("YEAR")));
        Table result = execute(aggregate);

        verify(result.getPeriodSeriesColumn(0),
                null,
                new PeriodSeries(Period.YEAR, 101, 1, Doubles.ERROR_NA, 2),
                null,
                new PeriodSeries(Period.YEAR, 105, 3, Doubles.ERROR_NA, Doubles.ERROR_NA, 4),
                null
        );
    }

    @Test
    void testSimplePivot() {
        /*
            [*] = Table.Filter([x] >= 100).Pivot([y], Sum([z]))
            [d] = [a] + [b] + [c]
        */

        // source uref: Table.Filter([x] >= 100)
        Plan source = table(
                /* current row */ new DoubleDirectColumn(0, 1, 2, 3, 4, 5),
                /* y           */ new StringDirectColumn("a", "a", "b", "a", "b", "c"),
                /* z           */ new DoubleDirectColumn(100, 101, 102, 103, 104, 105)
        );

        // vertical layout: source.DistinctBy([y])
        DistinctByLocal vLayout = new DistinctByLocal(
                new SelectLocal(new Get(source, 1)),
                List.of(new Get(source, 0))
        );

        Plan allNamesPlan = new PivotNamesLocal(
                new DistinctByLocal(source, List.of(new Get(source, 1)))
        );

        // vertical group: vLayout.Join(source, [pivot_key])
        SelectLocal vLeft = new SelectLocal(new RowNumber(vLayout), new Get(vLayout, 0));
        JoinAllLocal vGroup = new JoinAllLocal(
                vLeft,
                source,
                List.of(new Get(vLeft, 1)),
                List.of(new Get(source, 1))
        );

        // vertical aggregate: vGroup.Sum([z])
        NestedAggregateLocal vSum = new NestedAggregateLocal(AggregateFunction.SUM, vLayout, vGroup,
                new Get(vGroup, 0), new Get(vGroup, 4));

        // horizontal aggregate to produce pivoted [a], [b], [c] for: [d] = [a] + [b] + [c]
        SelectLocal hSource = new SelectLocal(new Get(vLayout, 0), new Get(vSum, 0));
        SimplePivotLocal hPivot = new SimplePivotLocal(
                new Scalar(),
                hSource,
                new Get(hSource, 0), new Get(hSource, 1),
                allNamesPlan, new Get(allNamesPlan, 1),
                new String[] {"a", "b", "d"}
        );

        Table result = execute(hPivot);
        verify(result.getDoubleColumn(0), 304);
        verify(result.getDoubleColumn(1), 206);
        verify(result.getDoubleColumn(2), Doubles.ERROR_NA);
    }

    @Test
    void testNestedPivot() {
        /*
          dim [x] = Table.DistinctBy([x])[x]
              [*] = Table.Filter([x] = @[x]).Pivot([y], Sum([z]))
              [d] = [a] + [b] + [c]
        */

        // source mref: Table.Filter([x] = @[x])
        Plan source = table(
                /* current row */ new DoubleDirectColumn(0, 0, 0, 1, 1, 1),
                /* query row   */ new DoubleDirectColumn(0, 1, 2, 0, 1, 2),
                /* y           */ new StringDirectColumn("a", "a", "b", "a", "b", "c"),
                /* z           */ new DoubleDirectColumn(100, 101, 102, 103, 104, 105)
        );

        // vertical layout: source.DistinctBy([current_row], [y])
        SelectLocal hLayoutSource = new SelectLocal(new Get(source, 0), new Get(source, 2));
        DistinctByLocal vLayout = new DistinctByLocal(
                hLayoutSource,
                List.of(new Get(hLayoutSource, 0), new Get(hLayoutSource, 1))
        );

        Plan allNamesPlan = new PivotNamesLocal(
                new DistinctByLocal(vLayout, List.of(new Get(vLayout, 1)))
        );

        // vertical group: vLayout.Join(source, [current_row], [y])
        SelectLocal vLeft = new SelectLocal(new RowNumber(vLayout), new Get(vLayout, 0), new Get(vLayout, 1));
        JoinAllLocal vGroup = new JoinAllLocal(
                vLeft,
                source,
                List.of(new Get(vLeft, 1), new Get(vLeft, 2)),
                List.of(new Get(source, 0), new Get(source, 2))
        );

        // vertical aggregate: vGroup.Sum([z])
        NestedAggregateLocal vSum = new NestedAggregateLocal(AggregateFunction.SUM, vLayout, vGroup,
                new Get(vGroup, 0), new Get(vGroup, 6));

        // horizontal layout: Table.DistinctBy([x])
        RangeLocal hLayout = new RangeLocal(new Constant(2));
        // horizontal aggregate to produce pivoted [a], [b], [c] for: [d] = [a] + [b] + [c]
        SelectLocal hSource = new SelectLocal(new Get(vLayout, 0), new Get(vLayout, 1), new Get(vSum, 0));
        NestedPivotLocal hPivot = new NestedPivotLocal(
                hLayout,
                hSource,
                new Get(hSource, 0), new Get(hSource, 1), new Get(hSource, 2),
                allNamesPlan, new Get(allNamesPlan, 1),
                new String[] {"a", "d", "c"}
        );

        Table result = execute(hPivot);
        verify(result.getDoubleColumn(0), 201, 103);
        verify(result.getDoubleColumn(1), Doubles.ERROR_NA, Doubles.ERROR_NA);
        verify(result.getDoubleColumn(2), Doubles.EMPTY, 105);
    }

    @Test
    void testInputLocal() {
        InputLocal inputLocal = TestInputs.createLocalInput(CPI_CSV);

        Table result = execute(inputLocal);

        // DATA_DOMAIN.id
        verify(result.getStringColumn(0), "CPI", "CPI", "CPI", "CPI", "CPI");
        // REF_AREA.id
        verify(result.getDoubleColumn(1), 111, 111, 111, 111, 111);
        // INDICATOR.id
        verify(result.getStringColumn(2), "GDP", "GDP", "GDP", "GDP", "GDP");
        // COUNTERPART_AREA.id
        verify(result.getStringColumn(3), "W1", "W1", "W1", "W1", "W1");
        // FREQ.id
        verify(result.getStringColumn(4), "A", "A", "A", "Q", "Q");
        // TIME_PERIOD
        verify(result.getDoubleColumn(5), 43101, 43466, 43831, 43101, 43191);
        // OBS_VALUE
        verify(result.getDoubleColumn(6), 105.57, 104.67, 99.87, 135.987, 145.4);
        // COMMENT
        verify(result.getStringColumn(7), null, null, null, null, null);
    }

    @Test
    void testPartialInputLocal() {
        InputMetadata inputMetadata = TestInputs.readMetadata(CPI_CSV);
        List<String> readColumns = List.of("TIME_PERIOD", "DATA_DOMAIN.id");
        InputLocal inputLocal = new InputLocal(inputMetadata, new LocalInputProvider(INPUTS_PATH), readColumns, null);

        Table result = execute(inputLocal);

        // TIME_PERIOD
        verify(result.getDoubleColumn(0), 43101, 43466, 43831, 43101, 43191);
        // DATA_DOMAIN.id
        verify(result.getStringColumn(1), "CPI", "CPI", "CPI", "CPI", "CPI");
    }

    @Test
    void testPeriodSeriesExtrapolate() {
        Plan table = table(
                new PeriodSeriesDirectColumn(
                        new PeriodSeries(Period.YEAR, 100, 10, Doubles.ERROR_NA, Doubles.ERROR_NA, 20),
                        new PeriodSeries(Period.YEAR, 105, 7, 3, Doubles.ERROR_NA, 5),
                        new PeriodSeries(Period.YEAR, 112, 12.5, 5, 9, 10.3),
                        PeriodSeries.empty(Period.YEAR),
                        null
                )
        );

        Extrapolate extrapolation = new Extrapolate(new Get(table, 0));
        Table result = execute(extrapolation);

        verify(result.getPeriodSeriesColumn(0),
                new PeriodSeries(Period.YEAR, 100, 10, 10, 10, 20),
                new PeriodSeries(Period.YEAR, 105, 7, 3, 3, 5),
                new PeriodSeries(Period.YEAR, 112, 12.5, 5, 9, 10.3),
                PeriodSeries.empty(Period.YEAR),
                null
        );
    }

    @Test
    void testPeriodSeriesPercentChange() {
        Plan table = table(
                new PeriodSeriesDirectColumn(
                        new PeriodSeries(Period.YEAR, 100, 2, 2, 8, 16),
                        new PeriodSeries(Period.YEAR, 105, 5, 10, 20, 40),
                        new PeriodSeries(Period.YEAR, 112, 40, 20, 10),
                        PeriodSeries.empty(Period.YEAR),
                        null
                )
        );

        PercentChange percentChange = new PercentChange(new Get(table, 0));
        Table result = execute(percentChange);

        verify(result.getPeriodSeriesColumn(0),
                new PeriodSeries(Period.YEAR, 101, 0, 300, 100),
                new PeriodSeries(Period.YEAR, 106, 100, 100, 100),
                new PeriodSeries(Period.YEAR, 113, -50, -50),
                PeriodSeries.empty(Period.YEAR),
                null);
    }

    @Test
    void testError() {
        ErrorTestExpression error = new ErrorTestExpression(new Scalar(), new ArithmeticException("Math failed"));
        RangeLocal range = new RangeLocal(error);

        Exception e = executeError(range);
        assertThat(e).isInstanceOf(ArithmeticException.class);
    }

    @Test
    void testGapFillerJoin() {
        val carry = new ResultTestPlan(
                new RowNumber(new RangeLocal(new Constant(5))).evaluate(),
                new StringDirectColumn("s0", "s1", "s2", "s3", "s4")
        );
        val nested = new ResultTestPlan(
                new DoubleDirectColumn(0, 0, 0, 3),
                new DoubleDirectColumn(1, 2, 3, 4),
                new StringDirectColumn("q1", "q2", "q3", "q4"),
                new PeriodSeriesDirectColumn(
                        new PeriodSeries(Period.YEAR, 101, 0, 300, 100),
                        new PeriodSeries(Period.YEAR, 106, 100, 100, 100),
                        PeriodSeries.empty(Period.YEAR),
                        null)
        );
        val gapFilled = new GapFillerJoinLocal(
                carry, new Get(carry, 0),
                nested, new Get(nested, 0));

        Table result = gapFilled.execute();
        verify(result.getDoubleColumn(0), 0, 0, 0, 1, 2, 3, 4);
        verify(result.getStringColumn(1), "s0", "s0", "s0", "s1", "s2", "s3", "s4");
        verify(result.getDoubleColumn(2), 0, 0, 0, Doubles.ERROR_NA, Doubles.ERROR_NA, 3, Doubles.ERROR_NA);
        verify(result.getDoubleColumn(3), 1, 2, 3, Doubles.ERROR_NA, Doubles.ERROR_NA, 4, Doubles.ERROR_NA);
        verify(result.getStringColumn(4), "q1", "q2", "q3", null, null, "q4", null);
        verify(result.getPeriodSeriesColumn(5),
                new PeriodSeries(Period.YEAR, 101, 0, 300, 100),
                new PeriodSeries(Period.YEAR, 106, 100, 100, 100),
                PeriodSeries.empty(Period.YEAR),
                null, null, null, null);
    }

    @Test
    void testDoubleOverrides() {
        Plan table = table(
                new DoubleDirectColumn(0, 1, 2, 3, 4, 5, 6, 7, 8, 9), // row number key
                new DoubleDirectColumn(Doubles.ERROR_NA, 0, 1, 3, 2, 4, 4, 2, 3, 3)
        );

        Get rowNumber = new Get(table, 0);
        Get columnToOverride = new Get(table, 1);

        Overrides override = new Overrides(
                // key column
                List.of(rowNumber),
                // column to override
                columnToOverride,
                // key overrides
                List.of(new double[]{0, 9}),
                // override values
                List.of(new Constant(10), new Constant(0)));

        Table result = execute(override);
        verify(result.getDoubleColumn(0), 10, 0, 1, 3, 2, 4, 4, 2, 3, 0);
    }

    @Test
    void testDoubleOverridesWithMultipleKeys() {
        Plan table = table(
                new DoubleDirectColumn(0, 1, 2, 3, 4, 5),
                new DoubleDirectColumn(Doubles.ERROR_NA, 0, 1, 3, 2, 4),
                new StringDirectColumn("a", "b", "c", "d", "e", "f")
        );

        Get rowNumberKey = new Get(table, 0);
        Get secondKey = new Get(table, 2);
        Get columnToOverride = new Get(table, 1);

        Overrides override = new Overrides(
                // key column
                List.of(rowNumberKey, secondKey),
                // column to override
                columnToOverride,
                // key overrides
                List.of(new double[]{0, 5}, new String[]{"a", "f"}),
                // override values
                List.of(new Constant(10), new Constant(0)));

        Table result = execute(override);
        verify(result.getDoubleColumn(0), 10, 0, 1, 3, 2, 0);
    }

    @Test
    void testStringOverrides() {
        Plan table = table(
                new DoubleDirectColumn(0, 1, 2, 3, 4, 5),
                new StringDirectColumn("a", "b", "c", "d", "e", "f")
        );

        Get rowNumber = new Get(table, 0);
        Get columnToOverride = new Get(table, 1);

        Overrides override = new Overrides(
                // key column
                List.of(rowNumber),
                // column to override
                columnToOverride,
                // key overrides
                List.of(new double[]{0, 5}),
                // override values
                List.of(new Constant("abc"), new Constant("ssd")));

        Table result = execute(override);
        verify(result.getStringColumn(0), "abc", "b", "c", "d", "e", "ssd");
    }

    @Test
    void testStringOverridesWithMultipleKeys() {
        Plan table = table(
                new DoubleDirectColumn(0, 1, 2, 3, 4, 5),
                new StringDirectColumn("a", "b", "c", "d", "e", "f"),
                new StringDirectColumn("x", "y", "z", "f", "h", "k")
        );

        Get rowNumberKey = new Get(table, 0);
        Get secondKey = new Get(table, 2);
        Get columnToOverride = new Get(table, 1);

        Overrides override = new Overrides(
                // key column
                List.of(rowNumberKey, secondKey),
                // column to override
                columnToOverride,
                // key overrides
                List.of(new double[]{0, 5}, new String[]{"x", "k"}),
                // override values
                List.of(new Constant("abc"), new Constant("ssd")));

        Table result = execute(override);
        verify(result.getStringColumn(0), "abc", "b", "c", "d", "e", "ssd");
    }


    private static Plan table(Column... columns) {
        return new ResultTestPlan(columns);
    }
}