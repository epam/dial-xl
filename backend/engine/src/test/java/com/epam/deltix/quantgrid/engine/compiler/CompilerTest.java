package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.test.ResultCollector;
import com.epam.deltix.quantgrid.engine.test.TestInputs;
import com.epam.deltix.quantgrid.engine.value.Period;
import com.epam.deltix.quantgrid.engine.value.PeriodSeries;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Disabled;
import org.junit.jupiter.api.Test;

import static com.epam.deltix.quantgrid.engine.test.TestAsserts.verify;
import static com.epam.deltix.quantgrid.engine.test.TestExecutor.executeWithErrors;
import static com.epam.deltix.quantgrid.engine.test.TestExecutor.executeWithoutErrors;
import static com.epam.deltix.quantgrid.engine.test.TestExecutor.executeWithoutProjections;
import static java.lang.Double.NaN;
import static org.assertj.core.api.Assertions.assertThat;

class CompilerTest {

    @Test
    void testDim0() {
        String dsl = """
                    table A
                        [a] = 1 + 2
                        [b] = [a] + 3 + 4
                        [c] = A.COUNT() + 5
                        [d] = NA
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 3);
        data.verify("A", "b", 10);
        data.verify("A", "c", 6);
        data.verify("A", "d", NaN);
    }

    @Test
    void testDim1Range() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = [a] + 3 + 4
                           [c] = A.COUNT() + 5
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 1, 2, 3, 4);
        data.verify("A", "b", 7, 8, 9, 10, 11);
        data.verify("A", "c", 10, 10, 10, 10, 10);
    }

    @Test
    void testDim1Filter() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5).FILTER($ > 3)
                           [b] = [a] + 1

                    table B
                       dim [c] = A.FILTER($[a] > 3)
                           [d] = [c][b]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 4);
        data.verify("A", "b", 5);

        data.verify("B", "c", 0);
        data.verify("B", "d", 5);
    }

    @Test
    void testDim2Range() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                       dim [b] = RANGE(4)
                           [c] = [a] + [b]
                           [d] = ROW()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2);
        data.verify("A", "b", 0, 1, 2, 3, 0, 1, 2, 3, 0, 1, 2, 3);
        data.verify("A", "c", 0, 1, 2, 3, 1, 2, 3, 4, 2, 3, 4, 5);
        data.verify("A", "d", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11);
    }

    @Test
    void testDim2FlatTables() {
        String dsl = """
                table A
                   dim [a] = RANGE(5)
                       
                table B
                   dim [b] = A.FILTER($[a] > 1)
                   dim [c] = A.FILTER($[a] > 2)
                       [d] = [b][a] + [c][a]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 1, 2, 3, 4);

        data.verify("B", "b", 2, 2, 3, 3, 4, 4);
        data.verify("B", "c", 3, 4, 3, 4, 3, 4);
        data.verify("B", "d", 5, 6, 6, 7, 7, 8);
    }

    @Test
    void testDim2NestedTables() {
        String dsl = """
                table A
                  dim [a] = RANGE(3)
                                
                table B
                  dim [a] = RANGE(2)
                  dim [b] = RANGE(5)
                  [c] = A.FILTER($[a] == [a])
                  [d] = A.FILTER($[a] == [b])
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 1, 2);
        data.verify("B", "a", 0, 0, 0, 0, 0, 1, 1, 1, 1, 1);
        data.verify("B", "b", 0, 1, 2, 3, 4, 0, 1, 2, 3, 4);

        data.verify("B", "c", 1, 1, 1, 1, 1, 1, 1, 1, 1, 1);
        data.verify("B", "d", 1, 1, 1, 0, 0, 1, 1, 1, 0, 0);
    }

    @Test
    void testDim2Filter() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                       dim [b] = RANGE(4).FILTER($ > 2)
                           [c] = [a] + [b]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 1, 2);
        data.verify("A", "b", 3, 3, 3);
        data.verify("A", "c", 3, 4, 5);
    }

    @Test
    void testDim2DependentFilter() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                       dim [b] = RANGE(4).FILTER($ > [a])
                           [c] = [a] + [b]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 0, 0, 1, 1, 2);
        data.verify("A", "b", 1, 2, 3, 2, 3, 3);
        data.verify("A", "c", 1, 2, 3, 3, 4, 5);
    }

    @Test
    void testFindDim0() {
        String dsl = """
                    table A
                       key [a] = 1
                           [b] = 2

                    table B
                       [x1] = 1
                       [y] = A.FIND([x1])[b]
                       
                     table C
                       dim [x] = RANGE(2)
                           [r] = A.FIND(1)
                           [b] = [r][b]
                           [c] = C.FILTER($[b] == $[r][b]).COUNT()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "y", 2);
        data.verify("C", "b", 2, 2);
    }

    @Test
    void testFind() {
        String dsl = """
                    table A
                       key dim [a] = RANGE(4)
                           key [ab] = [a] + 10
                           [c] = [ab] + 100

                    table B
                       dim [x1] = RANGE(3)
                           [x2] = [x1] + 10
                           [y] = A.FILTER($[a] >= 1).FIND([x1], [x2])[c]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "y", NaN, 111, 112);
    }

    @Test
    @Disabled("Not yet supported")
    void testFindAfterCartesian() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3) # 0,1,2
                       key [b] = [a] + 11 # 11,12,13

                    table B
                       dim [c] = RANGE(5)  # 0,1,2,3,4
                           [d] = [c] + 10  # 10,11,12,13,14
                           [e] = A.FILTER($[b] >= [d]).FIND([d])[a]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "e", NaN, 0, 1, 2, NaN);
    }

    @Test
    @Disabled("Not yet supported")
    void testFindAfterCartesianByZeroDimension() { // #bullshitgraph
        String dsl = """
                    table A
                       dim [a] = RANGE(3) # 0,1,2
                       key [b] = [a] + 11 # 11,12,13

                    table B
                       dim [c] = RANGE(5)  # 0,1,2,3,4
                           [d] = [c] + 10  # 10,11,12,13,14
                           [e] = 12
                           [f] = A.FILTER($[b] >= [d]).FIND([e])[a]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "f", 1, 1, 1, NaN, NaN);
    }

    @Test
    void testDim3Range() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                       dim [b] = RANGE(4)
                       dim [c] = RANGE(5)
                           [d] = [a] + [b] + [c]
                           [e] = [c] + [b] + [a]
                           [f] = [a] + [c] + [b]
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDim3With2on1And3on1() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = A
                       
                    table B
                       dim [d] = A.FILTER(1)
                       dim [e] = A.FILTER([d][a] < $[a])
                       dim [f] = A.FILTER([d][a] == $[a])
                           [g] = [d][a]
                           [h] = [e][a]
                           [j] = [f][a]
                           [k] = [d][b]
                           [l] = [e][b]
                           [m] = [f][b]
                           [n] = [d][a] + 1
                           [o] = [e][a] + 2
                           [p] = [f][a] + 3
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDim4Range() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                       dim [b] = RANGE(4).FILTER($ > [a])
                       dim [c] = RANGE(5)
                       dim [d] = RANGE(6)
                           [f] = [c] + [d]
                           [e] = [a] + [c]
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDim10Range() {
        String dsl = """
                    table A
                       dim [a] = RANGE(1)
                       dim [b] = RANGE(2)
                       dim [c] = RANGE(3)
                       dim [d] = RANGE(4)
                       dim [e] = RANGE(5)
                       dim [f] = RANGE(1)
                       dim [g] = RANGE(2)
                       dim [h] = RANGE(3)
                       dim [i] = RANGE(4)
                       dim [j] = RANGE(5)
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDim1PeriodSeries() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = [a] + 10
                           [c] = [b] + 20
                       
                    table B
                       dim [d] = A.PERIODSERIES($[b], $[c], "DAY")
                           [e] = [d][period]
                           [f] = [d][timestamp]
                           [g] = [d][value]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "d", "(1900-01-10, 30.0)", "(1900-01-11, 31.0)",
                "(1900-01-12, 32.0)", "(1900-01-13, 33.0)", "(1900-01-14, 34.0)");

        data.verify("B", "e", "DAY", "DAY", "DAY", "DAY", "DAY");
        data.verify("B", "f", 10, 11, 12, 13, 14);
        data.verify("B", "g", 30, 31, 32, 33, 34);
    }

    @Test
    void testDim2PeriodSeries() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = [a] + 10
                           [c] = [b] + 20
                       
                    table B
                       dim [d] = RANGE(4)
                       dim [e] = A.FILTER([d] < $[a]).PERIODSERIES($[b], $[c], "DAY")
                           [f] = [e][period]
                           [g] = [e][timestamp]
                           [h] = [e][value]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "e",
                "(1900-01-11, 31.0)", "(1900-01-12, 32.0)", "(1900-01-13, 33.0)", "(1900-01-14, 34.0)",
                "(1900-01-12, 32.0)", "(1900-01-13, 33.0)", "(1900-01-14, 34.0)", "(1900-01-13, 33.0)",
                "(1900-01-14, 34.0)", "(1900-01-14, 34.0)");

        data.verify("B", "f", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY");
        data.verify("B", "g", 11, 12, 13, 14, 12, 13, 14, 13, 14, 14);
        data.verify("B", "h", 31, 32, 33, 34, 32, 33, 34, 33, 34, 34);
    }

    @Test
    void testDim3PeriodSeries() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = [a] + 10
                           [c] = [b] + 20
                       
                    table B
                       dim [d] = RANGE(4)
                       dim [e] = A.FILTER([d] < $[a]).PERIODSERIES($[b], $[c], "DAY")
                       dim [f] = A.FILTER([d] == $[a])
                           [g] = [e][period]
                           [h] = [e][timestamp]
                           [j] = [e][value]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "e",
                "(1900-01-11, 31.0)", "(1900-01-12, 32.0)", "(1900-01-13, 33.0)", "(1900-01-14, 34.0)",
                "(1900-01-12, 32.0)", "(1900-01-13, 33.0)", "(1900-01-14, 34.0)", "(1900-01-13, 33.0)",
                "(1900-01-14, 34.0)", "(1900-01-14, 34.0)");

        data.verify("B", "g",
                "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY", "DAY");
        data.verify("B", "h",
                11, 12, 13, 14, 12, 13, 14, 13, 14, 14);
        data.verify("B", "j",
                31, 32, 33, 34, 32, 33, 34, 33, 34, 34);
    }

    @Test
    void testDistinct() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                           [b] = [a] + 10
                           
                    table B
                       dim [c] = A[a].DISTINCT()
                       dim [d] = A.FILTER($[a] <= [c])[b].DISTINCT()
                           [e] = [c] + [d] + 1
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "c", 0, 1, 1, 2, 2, 2);
        data.verify("B", "d", 10, 10, 11, 10, 11, 12);
        data.verify("B", "e", 11, 12, 13, 13, 14, 15);
    }

    @Test
    void testDistinctBy() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                           [b] = [a] + 10
                           
                    table B
                       dim [c] = A.DISTINCTBY($[a], $[b] + 5)[a]
                       dim [d] = A.DISTINCTBY($[a] + [c])[b]
                           [e] = [c] + [d] + 1
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testOrderBy() {
        String dsl = """
                    table A
                       dim [a] = RANGE(4)
                           
                    table B
                       dim [c] = A.ORDERBY(-$[a])[a]
                       dim [d] = A[a].FILTER($ < [c]).ORDERBY(-$)
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "c", 3, 3, 3, 2, 2, 1);
        data.verify("B", "d", 2, 1, 0, 1, 0, 0);
    }

    @Test
    void testSum() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           
                    table B
                       dim [b] = RANGE(6)
                           [c] = A[a].SUM()
                           [d] = A.FILTER([b] < $[a])[a].SUM()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "c", 10, 10, 10, 10, 10, 10);
        data.verify("B", "d", 10, 9, 7, 4, 0, 0);
    }

    @Test
    void testAverage() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           
                    table B
                       dim [b] = RANGE(6)
                           [c] = A[a].AVERAGE()
                           [d] = A.FILTER([b] < $[a])[a].AVERAGE()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "c", 2.0, 2.0, 2.0, 2.0, 2.0, 2.0);
        data.verify("B", "d", 2.5, 3.0, 3.5, 4.0, NaN, NaN);
    }

    @Test
    void testMin() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           
                    table B
                       dim [b] = RANGE(6)
                           [c] = A[a].MIN()
                           [d] = A.FILTER([b] < $[a])[a].MIN()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "c", 0.0, 0.0, 0.0, 0.0, 0.0, 0.0);
        data.verify("B", "d", 1.0, 2.0, 3.0, 4.0, NaN, NaN);
    }

    @Test
    void testMax() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           
                    table B
                       dim [b] = RANGE(6)
                           [c] = A[a].MAX()
                           [d] = A.FILTER([b] < $[a])[a].MAX()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "c", 4.0, 4.0, 4.0, 4.0, 4.0, 4.0);
        data.verify("B", "d", 4.0, 4.0, 4.0, 4.0, NaN, NaN);
    }

    @Test
    void testFirst() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = A[a].FIRST()
                           [c] = A.FIRST()[a]
                           [d] = A.FILTER([a] < $[a])[a].FIRST()
                           [e] = A.FILTER([a] < $[a]).FIRST()[a]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "b", 0, 0, 0, 0, 0);
        data.verify("A", "c", 0, 0, 0, 0, 0);
        data.verify("A", "d", 1, 2, 3, 4, NaN);
        data.verify("A", "e", 1, 2, 3, 4, NaN);
    }

    @Test
    void testSingle() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = A.FILTER($[a] == 2)[a].SINGLE()
                           [c] = A.FILTER($[a] == 2).SINGLE()[a]
                           [d] = A.FILTER([a] < $[a])[a].SINGLE()
                           [e] = A.FILTER([a] < $[a]).SINGLE()[a]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "b", 2, 2, 2, 2, 2);
        data.verify("A", "c", 2, 2, 2, 2, 2);
        data.verify("A", "d", NaN, NaN, NaN, 4, NaN);
        data.verify("A", "e", NaN, NaN, NaN, 4, NaN);
    }

    @Test
    void testLast() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = A[a].LAST()
                           [c] = A.LAST()[a]
                           [d] = A.FILTER([a] < $[a])[a].LAST()
                           [e] = A.FILTER([a] < $[a]).LAST()[a]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "b", 4, 4, 4, 4, 4);
        data.verify("A", "c", 4, 4, 4, 4, 4);
        data.verify("A", "d", 4, 4, 4, 4, NaN);
        data.verify("A", "e", 4, 4, 4, 4, NaN);
    }

    @Test
    void testFirsts() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = A[a].FIRST(1).SUM()
                           [c] = A.FIRST(3)[a].SUM()
                           [d] = A.FILTER([a] < $[a])[a].FIRST(1).SUM()
                           [e] = A.FILTER([a] < $[a]).FIRST([a])[a].SUM()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "b", 0, 0, 0, 0, 0);
        data.verify("A", "c", 3, 3, 3, 3, 3);
        data.verify("A", "d", 1, 2, 3, 4, 0);
        data.verify("A", "e", 0, 2, 7, 4, 0);
    }

    @Test
    void testLasts() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = A[a].LAST(2).SUM()
                           [c] = A.LAST(1)[a].SUM()
                           [d] = A.FILTER([a] < $[a])[a].LAST(1).SUM()
                           [e] = A.FILTER([a] < $[a]).LAST([a])[a].SUM()
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "b", 7, 7, 7, 7, 7);
        data.verify("A", "c", 4, 4, 4, 4, 4);
        data.verify("A", "d", 4, 4, 4, 4, 0);
        data.verify("A", "e", 0, 4, 7, 4, 0);
    }

    @Test
    void testDereferenceFlatTable() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                           
                    table B
                       dim [b] = A.FILTER(1)
                       
                    table C
                       dim [c] = A.FILTER(2)
                           [x] = B.FILTER([c][a] == $[b][a]).COUNT()
                           
                    table D
                       dim [d] = B.FILTER(3)
                           [y] = [d][b][a]
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDereferenceFlatDependentTable() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                           
                    table B
                       dim [b] = A.FILTER(1)
                       
                    table C
                       dim [c] = A.FILTER(2)
                       dim [d] = B.FILTER([c][a] == $[b][a])
                           [n] = [d][b]
                           
                    table D
                       dim [e] = C.FILTER($[c][a] == $[d][b][a])
                           [x] = [e][n][a]
                           [y] = [e][c][a]
                           [z] = [e][d][b][a]
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDereferenceFlatDependentTableInNestedContext() {
        String dsl = """
                    table A
                       dim [a] = RANGE(3)
                           
                    table B
                       dim [b] = A.FILTER(1)
                       
                    table C
                       dim [c] = B.FILTER(2)[b].FILTER($[a])[a]
                       dim [d] = B.FILTER([c] == $[b][a])[b].FILTER($[a])[a]
                           [e] = [c] + [d]
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDereferenceNestedTable() {
        String dsl = """
                    table A
                       key dim [a] = RANGE(3)
                           [b] = A.FILTER($[a] <= [a])
                           
                    table B
                       dim [c] = A
                       dim [d] = [c][b]
                           [e] = [d][a]
                """;

        executeWithoutErrors(dsl);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "e", 0, 0, 1, 0, 1, 2);
    }

    @Test
    void testDereferenceNestedTableAfterFind() {
        String dsl = """
                    table A
                       key dim [a] = RANGE(3)
                           [b] = A.FILTER($[a] <= [a])
                           
                    table B
                       dim [c] = A.FIND(1)[b]
                           [d] = [c][a]
                """;

        executeWithoutErrors(dsl);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "d", 0, 1);
    }

    @Test
    void testDereferenceNestedTableWithinFormula() {
        String dsl = """
                    table A
                       key dim [a] = RANGE(3)
                           [b] = A.FILTER($[a] <= [a])
                           [c] = A.FILTER($[b].COUNT())
                """;

        ResultCollector data = executeWithErrors(dsl);
        Assertions.assertEquals("Dereferencing nested table within formula is not allowed", data.getError("A", "c"));
    }

    @Test
    void testInputSingleDim() {
        String dsl = """
                    table A
                       dim [a]  = INPUT("%s")
                           [f1]  = [a][DATA_DOMAIN.id] # dereference !nested field from INPUT
                           [f3]  = [a][INDICATOR.id]
                           [f7]  = [a][OBS_VALUE]
                           [b]  = [f7] + 1
                  
                    table B
                       dim [f3]  = A.DISTINCTBY($[f3])[f3]
                """.formatted(TestInputs.CPI_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "f1", "CPI", "CPI", "CPI", "CPI", "CPI");
        data.verify("A", "b", 106.57, 105.67, 100.87, 136.987, 146.4);
    }

    @Test
    void testInputWithQuotedHeaders() {
        String dsl = """
                    table A
                      dim [source] = INPUT("country-stats-quoted.csv")
                          [country] = [source][country]
                          [date] = [source][date]
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "country", "USA", "USA", "China", "China", "EU", "EU");
        data.verify("A", "date", 44197.0, 44562.0, 44197.0, 44562.0, 44197.0, 44562.0);
    }

    @Test
    void testInputJoin() {
        String dsl = """
                    table A
                      dim [a] = RANGE(3)

                      # dereference a nested column with dims
                      dim [b] = INPUT("%s").FILTER($[OBS_VALUE] == [a] AND $[DATA_DOMAIN.id] == "CPI")[OBS_VALUE]
                """.formatted(TestInputs.CPI_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a");
        data.verify("A", "b");
    }

    @Test
    void testInputNestedField() {
        String dsl = """
                    table A
                       dim [r] = RANGE(2)
                       dim [a]  = INPUT("%s")[OBS_VALUE] # dereference nested field with empty dimensions
                           [b]  = [a] + 1
                """.formatted(TestInputs.CPI_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "r", 0, 0, 0, 0, 0, 1, 1, 1, 1, 1);
        data.verify("A", "a", 105.57, 104.67, 99.87, 135.987, 145.4, 105.57, 104.67, 99.87, 135.987, 145.4);
        data.verify("A", "b", 106.57, 105.67, 100.87, 136.987, 146.4, 106.57, 105.67, 100.87, 136.987, 146.4);
    }

    @Test
    void testInputWithFilterMultiDim() {
        String dsl = """
                    table A
                       dim [a]   = INPUT("%s").FILTER($[OBS_VALUE] > 100) # dereference !nested column [OBS_VALUE]
                           [f1]  = [a][DATA_DOMAIN.id]
                           [f3]  = [a][INDICATOR.id]
                           [f6]  = [a][TIME_PERIOD]
                           [f7]  = [a][OBS_VALUE]
                           [bin] = [f7] + 1
                       dim [b]   = RANGE(2)
                           [x]   = [b] + [bin]

                    table B
                       dim [a]  = A.FILTER($[bin] > 110)
                           [f1] = [a][f1]
                           [f7] = [a][bin]
                       dim [b]  = RANGE(2)
                           [f4] = [b] + [f7]
                """.formatted(TestInputs.CPI_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "bin", 106.57, 106.57, 105.67, 105.67, 136.987, 136.987, 146.4, 146.4);
        data.verify("A", "b", 0, 1, 0, 1, 0, 1, 0, 1);

        data.verify("B", "f7", 136.987, 136.987, 136.987, 136.987, 146.4, 146.4, 146.4, 146.4);
        data.verify("B", "b", 0, 1, 0, 1, 0, 1, 0, 1);
        data.verify("B", "f4", 136.987, 137.987, 136.987, 137.987, 146.4, 147.4, 146.4, 147.4);
    }

    @Test
    void testSimplePeriodSeries() {
        String dsl = """
                table A
                    dim [a]     = INPUT("%s")
                        [date]  = [a][date]
                        [value] = [a][value]

                table B
                    [a] = A.PERIODSERIES($[date], $[value], "DAY")
                    [b] = EXTRAPOLATE([a])
                    [c] = PERCENTCHANGE([a])
                """.formatted(TestInputs.USA_GDP_SORTED_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "a", new PeriodSeries(Period.DAY, 44561, 21060, 23315, NaN, NaN, 23316));
        data.verify("B", "b", new PeriodSeries(Period.DAY, 44561, 21060, 23315, 23315, 23315, 23316));
        data.verify("B", "c", new PeriodSeries(Period.DAY, 44562, 10.70750237416904));
    }

    @Test
    void testPivotDim() {
        String dsl = """
                    table A
                       dim [row]   = INPUT("%s")
                           [indicator]  = [row][indicator]
                           [value]  = [row][value]

                    table B
                       dim [*] = A.PIVOT($[indicator], $[value].COUNT())
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector collector = executeWithErrors(dsl);
        collector.verifyError("B", "*", "Pivot table can't be dimension or used in formulas");
    }

    @Test
    void testPivotInFormula() {
        String dsl = """
                    table A
                       dim [row]   = INPUT("%s")
                           [indicator]  = [row][indicator]
                           [value]  = [row][value]

                    table B
                           [*] = A.PIVOT($[indicator], $[value].COUNT()).FILTER($[IR] > 5)
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector collector = executeWithErrors(dsl);
        collector.verifyError("B", "*", "Pivot table can't be dimension or used in formulas");
    }

    @Test
    void testPivot() {
        String dsl = """
                    table A
                       dim [a]   = INPUT("%s")
                           [country]  = [a][country]
                           [date]  = [a][date]
                           [indicator]  = [a][indicator]
                           [value]  = [a][value]

                    table B
                       dim [a] = A.DISTINCTBY($[country], $[date])
                           [country] = [a][country]
                           [date] = [a][date]
                           [row] = A.FILTER([country] == $[country] AND [date] == $[date])
                           [*]   = [row].PIVOT($[indicator], B.COUNT() + $[value].FILTER($ > 0).COUNT())
                           [GDP Percent Change] = [GDP] + 1
                           [IR2] = [*][IR] + 1
                           [e] = [MISSING] + 1

                    table C
                        dim [a] = A.DISTINCTBY($[country])
                            [country] = [a][country]
                            [b] = B.FILTER([country] == $[country] AND $[GDP] == 7)[IR]
                            [c] = [b].COUNT()
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector data = executeWithoutProjections(dsl);

        data.verify("A", "country",
                "USA", "China", "EU", "USA", "China", "EU", "USA", "China", "EU", "USA", "China", "EU");
        data.verify("A", "date",
                44562, 44562, 44562, 44197, 44197, 44197, 44562, 44562, 44562, 44197, 44197, 44197);

        data.verify("B", "country", "USA", "China", "EU", "USA", "China", "EU");
        data.verify("B", "date", 44562, 44562, 44562, 44197, 44197, 44197);

        data.verify("B", "GDP Percent Change", 8, 8, 8, 8, 8, 8);
        data.verify("B", "IR2", 8, 8, 8, 8, 8, 8);

        assertThat(data.getError("B", "e")).isEqualTo("Field 'MISSING' is missing");
        assertThat(data.getErrors()).hasSize(1);

        data.verify("C", "c", 2, 2, 2);
    }

    @Test
    void testPivotPromoted() {
        String dsl = """
                    table A
                       dim [a]   = INPUT("%s")
                           [country]  = [a][country]
                           [date]  = [a][date]
                           [indicator]  = [a][indicator]
                           [value]  = [a][value]

                    table B
                       dim [n] = RANGE(2)
                       dim [a] = A.DISTINCTBY($[country], $[date])
                           [country] = [a][country]
                           [date] = [a][date]
                           [*] = A.FILTER([country] == $[country] AND [date] == $[date]).PIVOT($[indicator], COUNT($[value]))
                           [GDP Percent Change] = [GDP] + 1
                           [IR2] = [*][IR] + 1
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector data = executeWithoutErrors(dsl);

        data.verify("A", "country",
                "USA", "China", "EU", "USA", "China", "EU", "USA", "China", "EU", "USA", "China", "EU");
        data.verify("A", "date",
                44562, 44562, 44562, 44197, 44197, 44197, 44562, 44562, 44562, 44197, 44197, 44197);

        data.verify("B", "country", "USA", "China", "EU", "USA", "China", "EU",
                "USA", "China", "EU", "USA", "China", "EU");
        data.verify("B", "date", 44562, 44562, 44562, 44197, 44197, 44197,
                44562, 44562, 44562, 44197, 44197, 44197);

        data.verify("B", "GDP Percent Change", 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);
        data.verify("B", "IR2", 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2, 2);
    }

    @Test
    void testPivotWithPeriodSeries() {
        String dsl = """
                    table A
                       dim [a]         = INPUT("%s")
                           [country]   = [a][country]
                           [date]      = [a][date]
                           [indicator] = [a][indicator]
                           [value]     = [a][value]

                    table B
                       dim [a]       = A.DISTINCTBY($[country])
                           [country] = [a][country]
                           [row]     = A.FILTER([country] == $[country])
                           [*]       = [row].PIVOT($[indicator], $.PERIODSERIES($[date], $[value], "YEAR"))
                           [GDP_PS]  = [GDP]
                           [IR_PS]   = [IR]
                """.formatted(TestInputs.COUNTRY_INDICATORS_SORTED_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "GDP_PS",
                new PeriodSeries(Period.YEAR, 121, 21060, 23315),
                new PeriodSeries(Period.YEAR, 121, 14688, 17734),
                new PeriodSeries(Period.YEAR, 121, 13085, 14563));
        data.verify("B", "IR_PS",
                new PeriodSeries(Period.YEAR, 121, 5, 4.9),
                new PeriodSeries(Period.YEAR, 121, 0.1, 0.2),
                new PeriodSeries(Period.YEAR, 121, 7, 6.1));
    }

    @Test
    void testPivotWithErrors() {
        String dsl = """
                    table A
                       dim [a]         = INPUT("%s")
                           [country]   = [a][country]
                           [date]      = [a][date]
                           [indicator] = [a][indicator]
                           [value]     = [a][value]

                    table B
                       dim [a]                  = A.DISTINCTBY($[country], $[date])
                           [country]            = [a][country]
                           [date]               = [a][date]
                           [row]                = A.FILTER([country] == $[country] AND [date] == $[date])
                           [*]                  = [row].PIVOT($[indicator], COUNT($[value]))
                           [GDP Percent Change] = [GDP] + 1
                           [e]                  = [MISSING] + 1
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector data = executeWithoutProjections(dsl);
        data.verify("B", "GDP Percent Change", 2, 2, 2, 2, 2, 2);
        assertThat(data.getError("B", "e")).isEqualTo("Field 'MISSING' is missing");
    }

    @Test
    void testSimplePivot() {
        String dsl = """
                    table A
                       [*] = INPUT("%s").PIVOT($[indicator], COUNT($[value]))
                       [IR2] = [IR] + 1
                       [GDP Percent Change] = [GDP] + 1
                       [e] = [MISSING] + 1
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);
        ResultCollector data = executeWithoutProjections(dsl);
        data.verify("A", "IR2", 7);
        data.verify("A", "GDP Percent Change", 7);

        assertThat(data.getError("A", "e"))
                .isEqualTo("Field 'MISSING' is missing");
        assertThat(data.getErrors()).hasSize(1);
    }

    @Test
    void testSimplePivotPromoted() {
        String dsl = """
                    table A
                       dim [x] = RANGE(2)
                       [*] = INPUT("%s").PIVOT($[indicator], COUNT($[value]))
                       [IR2] = [IR] + 1
                       [GDP Percent Change] = [GDP] + 1
                       [e] = [MISSING] + 1
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);
        ResultCollector data = executeWithoutProjections(dsl);
        data.verify("A", "IR2", 7, 7);
        data.verify("A", "GDP Percent Change", 7, 7);

        assertThat(data.getError("A", "e"))
                .isEqualTo("Field 'MISSING' is missing");
        assertThat(data.getErrors()).hasSize(1);
    }

    @Test
    void testSimplePivotWithError() {
        String dsl = """
                    table A
                      [*]                   = INPUT("%s").PIVOT($[indicator], COUNT($[value]))
                      [GDP Percent Change]  = [GDP] + 1;
                      [e]                   = [MISSING] + 1;
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector data = executeWithoutProjections(dsl);
        data.verify("A", "GDP Percent Change", 7);
        assertThat(data.getError("A", "e"))
                .isEqualTo("Field 'MISSING' is missing");
    }

    @Test
    void testSimplePivotWithRefTable() {
        String dsl = """
                    table A
                        dim [a] = INPUT("%s")
                            [indicator] = [a][indicator]
                            [value] = [a][value]

                    table B
                       [*] = A.PIVOT($[indicator], COUNT($[value]))
                       [IR2] = [IR] + 1
                       [GDP Percent Change] = [GDP] + 1;
                """.formatted(TestInputs.COUNTRY_INDICATORS_CSV);

        ResultCollector data = executeWithoutErrors(dsl);

        data.verify("B", "IR2", 6 + 1);
        data.verify("B", "GDP Percent Change", 6 + 1);
    }

    @Test
    void testFieldsRef() {
        String dsl = """
                    table A
                       dim [a] = RANGE(5)
                           [b] = [a] + 3 + 4
                           [c] = [b] * 2

                    table B
                       dim [f] = A.FIELDS().FILTER($ <> "b")
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("B", "f", "a", "c");
    }

    @Test
    void testFieldsRange() {
        String dsl = """
                    table A
                       dim [f] = RANGE(3).FIELDS()
                """;
        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "f");
    }

    @Test
    void testFieldsInput() {
        String dsl = """
                    table A
                       dim [f] = INPUT("%s").FIELDS()
                """.formatted(TestInputs.CPI_CSV);
        ResultCollector collector = executeWithoutErrors(dsl);
        collector.verify("A", "f", "COMMENT", "COUNTERPART_AREA.id", "DATA_DOMAIN.id", "FREQ.id",
                "INDICATOR.id", "OBS_VALUE", "REF_AREA.id", "TIME_PERIOD");
    }

    @Test
    void testManualTable() {
        String dsl = """
                !manual()
                table A
                   [a] = NA
                   [b] = NA
                override
                [a], [b]
                "USA", 5
                "UK", 7
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", "USA", "UK");
        data.verify("A", "b", 5, 7);
    }

    @Test
    void testManualTableWithKey() {
        String dsl = """
                table B
                    dim [a] = A[a]

                !manual()
                table A
                   key [a] = NA
                   [b] = NA
                   [c] = [b] + 7
                override
                key [a], [b]
                "USA", 5
                "UK", 7
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verifyError("A", "b", "Override keys is not allowed in manual tables");
    }

    @Test
    void testOverrideWithoutKeys() {
        String dsl = """            
                table A
                   dim [a] = RANGE(3)
                       [x] = [a] + 10
                   dim [b] = RANGE(2)
                       [c] = [b] + 7
                override
                row, [a], [b]
                1, 6, 5
                2, 8, 7
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 6, 8, 1, 1, 2, 2);
        data.verify("A", "x", 16, 18, 11, 11, 12, 12);
        data.verify("A", "b", 5, 7, 0, 1, 0, 1);
        data.verify("A", "c", 12, 14, 7, 8, 7, 8);
    }

    @Test
    void testOverrideWithMultipleKeys() {
        String dsl = """
                table A
                   key dim [a] = RANGE(5)
                   key [b] = [a] + 3
                   [c] = 7
                   [d] = 9
                override
                key [a], key [b], [c]
                0, 3, 8
                1, 4, 9
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", 0, 1, 2, 3, 4);
        data.verify("A", "b", 3, 4, 5, 6, 7);
        data.verify("A", "c", 8, 9, 7, 7, 7);
        data.verify("A", "d", 9, 9, 9, 9, 9);
    }

    @Test
    void testNaOverrides() {
        String dsl = """            
                table A
                   dim [a] = RANGE(3)
                       [x] = [a] + 10
                   dim [b] = RANGE(2)
                       [c] = [b] + 7
                override
                row, [a], [b]
                1, NA, NA
                2, NA, NA
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "a", Double.NaN, Double.NaN, 1, 1, 2, 2);
        data.verify("A", "x", Double.NaN, Double.NaN, 11, 11, 12, 12);
        data.verify("A", "b", Double.NaN, Double.NaN, 0, 1, 0, 1);
        data.verify("A", "c", Double.NaN, Double.NaN, 7, 8, 7, 8);
    }

    @Test
    void testMissingOverrides() {
        String dsl = """
                table A
                   dim [a] = RANGE(5)
                       [b] = TEXT([a])
                override
                row,[a],[b]
                2,,10
                3,11,
                """;

        ResultCollector collector = executeWithoutErrors(dsl);
        collector.verify("A", "a", 0, 1, 11, 3, 4);
        collector.verify("A", "b", "0", "10", "11", "3", "4");
    }

    @Test
    void testCastingOverrides() {
        String dsl = """
                table A
                   dim [a] = RANGE(5)
                       [b] = [a]
                override
                row,[a],[b]
                2,"30",10
                3,11,
                """;

        ResultCollector collector = executeWithoutErrors(dsl);
        collector.verify("A", "a", "0", "30", "11", "3", "4");
        collector.verify("A", "b", "0", "10", "11", "3", "4");
    }

    @Test
    void testManualOverrides() {
        String dsl = """
                    !manual()
                    table A
                       [a] = NA
                       [b] = TEXT([a])
                    override
                       [a],[b]
                       0,
                       1,"b"
                       2,
                        ,"c"
                """;

        ResultCollector collector = executeWithoutErrors(dsl);
        collector.verify("A", "a", 0, 1, 2, NaN);
        collector.verify("A", "b", "0.0", "b", "2.0", "c");
    }

    @Test
    void testInvalidOverrideKeys() {
        String dsl = """            
                table A
                   dim [a] = RANGE(3)
                       [x] = [a] + 10
                override
                key [row], [a], [x]
                0, NA, NA
                1, NA, NA
                """;

        ResultCollector data = executeWithErrors(dsl);
        Assertions.assertEquals("Missing row column in override section", data.getError("A", "a"));
        Assertions.assertEquals("Missing row column in override section", data.getError("A", "x"));
    }

    @Test
    void testInvalidOverrideKeys2() {
        String dsl = """            
                table A
                   dim [a] = RANGE(3)
                       [x] = [a] + 10
                override
                row, key [a], [x]
                0, NA, NA
                1, NA, NA
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "a", 0, 1, 2);
        Assertions.assertEquals("Unknown table keys [a]", data.getError("A", "x"));
    }

    @Test
    void testNaOverrides2() {
        String dsl = """            
                table A
                   dim [source] = INPUT("%s")
                       [CPI] = [source][DATA_DOMAIN.id]
                override
                row, [CPI]
                1, NA
                2, NA
                """.formatted(TestInputs.CPI_CSV);

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "CPI", null, null, "CPI", "CPI", "CPI");
    }

    @Test
    void testUnpivotWithSimplePivot() {
        String dsl = """
                !manual()
                table A
                  [country] = NA
                  [population] = NA
                override
                [country], [population]
                "USA", 10
                "UK", 20
                "Spain", 30
                "USA", 40
                                
                table B
                   [*] = A.PIVOT($[country], SUM($[population]))
                   [Germany] = 100
                   
                table C
                   dim [row] = B.UNPIVOT("country", "population")
                       [country] = [row][country]
                       [population] = [row][population]
                """;

        ResultCollector collector = executeWithoutErrors(dsl);

        collector.verify("C", "country", "Germany", "Spain", "UK", "USA");
        collector.verify("C", "population", 100, 30, 20, 50);
    }

    @Test
    void testUnpivotWithSimplePivotAndCondition() {
        String dsl = """
                !manual()
                table A
                  [country] = NA
                  [population] = NA
                override
                [country], [population]
                "USA", 10
                "UK", 20
                "Spain", 30
                "USA", 40
                                
                table B
                   [*] = A.PIVOT($[country], SUM($[population]))
                   [Germany] = 100
                   [Italy] = 200
                   [bs] = "BS"
                   
                table C
                   dim [row] = B.UNPIVOT("country", "population", $ <> "Spain" AND $ <> "bs")
                       [country] = [row][country]
                       [population] = [row][population]
                """;

        ResultCollector collector = executeWithoutErrors(dsl);

        collector.verify("C", "country", "Germany", "Italy", "UK", "USA");
        collector.verify("C", "population", 100, 200, 20, 50);
    }

    @Test
    void testUnpivotWithSimplePivotAndPromotion() {
        String dsl = """
                !manual()
                table A
                  [country] = NA
                  [population] = NA
                override
                [country], [population]
                "USA", 10
                "UK", 20
                "Spain", 30
                "USA", 40
                                
                table B
                   dim [ignore] = RANGE(1)
                       [*] = A.PIVOT($[country], SUM($[population]))
                       [Germany] = 100
                   
                table C
                   dim [row] = B.UNPIVOT("country", "population", $ <> "ignore")
                       [country] = [row][country]
                       [population] = [row][population]
                """;

        ResultCollector collector = executeWithoutErrors(dsl);

        collector.verify("C", "country", "Germany", "Spain", "UK", "USA");
        collector.verify("C", "population", 100, 30, 20, 50);
    }

    @Test
    void testUnpivotWithNestedPivotAndCondition() {
        String dsl = """
                !manual()
                table A
                  [country] = NA
                  [indicator] = NA
                  [population] = NA
                override
                [country], [indicator], [population]
                "USA", "IR", 10
                "UK", "GDP", 20
                "Spain", "IR", 30
                "USA", "GDP", 40
                "USA", "GDP", 50
                                
                table B
                   dim [country] = DISTINCT(A[country])
                       [*] = A.FILTER([country] == $[country]).PIVOT($[indicator], SUM($[population]))
                       [ABC] = [IR] + 100
                   
                table C
                   dim [row] = B.UNPIVOT("indicator", "value", $ <> "country")
                       [country] = [row][country]
                       [indicator] = [row][indicator]
                       [value] = [row][value]
                """;

        ResultCollector collector = executeWithoutErrors(dsl);

        collector.verify("C", "country",
                "USA", "USA", "USA", "UK", "UK", "UK", "Spain", "Spain", "Spain");

        collector.verify("C", "indicator", "ABC", "GDP", "IR", "ABC", "GDP", "IR", "ABC", "GDP", "IR");
        collector.verify("C", "value", 110, 90, 10, NaN, 20, NaN, 130, NaN, 30);
    }

    @Test
    void testUnpivotWithoutPivot() {
        String dsl = """
                    table A
                       dim [row]     = INPUT("%s")
                           [country] = [row][country]
                           [date]    = [row][date]
                           [GDP]     = [row][GDP]
                           [IR]      = [row][IR]

                    table B
                       dim [row]       = A.UNPIVOT("indicator", "value", $ == "GDP" OR  $ == "IR")
                           [country]   = [row][country]
                           [date]      = [row][date]
                           [indicator] = [row][indicator]
                           [value]     = [row][value]
                """.formatted(TestInputs.COUNTRY_STATS_CSV);

        ResultCollector data = executeWithoutErrors(dsl);

        data.verify("B", "country",
                "USA", "USA", "USA", "USA", "China", "China", "China", "China", "EU", "EU", "EU", "EU");
        data.verify("B", "date",
                44197, 44197, 44562, 44562, 44197, 44197, 44562, 44562, 44197, 44197, 44562, 44562);
        data.verify("B", "indicator",
                "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR");
        data.verify("B", "value",
                21060, NaN, 23315, 4.9, 14688, 0.1, 17734, 0.2, 13085, 7, NaN, 6.1);
    }

    @Test
    void testUnpivotWithFilter() {
        String dsl = """
                    table A
                       dim [row]     = INPUT("%s")
                           [country] = [row][country]
                           [date]    = [row][date]
                           [GDP]     = [row][GDP]
                           [IR]      = [row][IR]

                    table B
                       dim [row]       = A.FILTER(1).UNPIVOT("indicator", "value", $ == "GDP" OR  $ == "IR").FILTER($[value] > 0)
                           [country]   = [row][country]
                           [date]      = [row][date]
                           [indicator] = [row][indicator]
                           [value]     = [row][value]
                """.formatted(TestInputs.COUNTRY_STATS_CSV);

        ResultCollector data = executeWithoutErrors(dsl);

        data.verify("B", "country", "USA", "USA", "USA", "China", "China", "China", "China", "EU", "EU",
                "EU");
        data.verify("B", "date", 44197, 44562, 44562, 44197, 44197, 44562, 44562, 44197, 44197, 44562);
        data.verify("B", "indicator", "GDP", "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR", "IR");
        data.verify("B", "value", 21060, 23315, 4.9, 14688, 0.1, 17734, 0.2, 13085, 7, 6.1);
    }

    @Test
    void testUnpivotWithCurrent() {
        String dsl = """
                    table A
                       dim [row]     = INPUT("%s")
                           [country] = [row][country]
                           [date]    = [row][date]
                           [GDP]     = [row][GDP]
                           [IR]      = [row][IR]

                    table B
                       dim [x]         = RANGE(2)
                       dim [row]       = A.FILTER([x] == 0).UNPIVOT("indicator", "value", $ == "GDP" OR  $ == "IR")
                           [country]   = [row][country]
                           [date]      = [row][date]
                           [indicator] = [row][indicator]
                           [value]     = [row][value]
                """.formatted(TestInputs.COUNTRY_STATS_CSV);

        ResultCollector data = executeWithoutErrors(dsl);

        data.verify("B", "country",
                "USA", "USA", "USA", "USA", "China", "China", "China", "China", "EU", "EU", "EU", "EU");
        data.verify("B", "date",
                44197, 44197, 44562, 44562, 44197, 44197, 44562, 44562, 44197, 44197, 44562, 44562);
        data.verify("B", "indicator",
                "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR", "GDP", "IR");
        data.verify("B", "value",
                21060, NaN, 23315, 4.9, 14688, 0.1, 17734, 0.2, 13085, 7, NaN, 6.1);
    }

    @Test
    void testCycleOverride() {
        String dsl = """
                table A
                    dim [a] = RANGE(3)
                        [b] = [a] + 7
                        
                table B
                    dim [x] = RANGE(5)
                    dim [y] = A.FILTER($[a] >= [x])[b]
                        [f] = A.FILTER($[a] >= [x]).COUNT()
                override
                row, [x]
                0, 5
                1, 6
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "a", 0, 1, 2);
        data.verify("A", "b", 7, 8, 9);

        Assertions.assertEquals("Cyclic dependency: B", data.getError("B", "f"));
        Assertions.assertEquals("Cyclic dependency: B", data.getError("B", "y"));
        Assertions.assertEquals("Cyclic dependency: B", data.getError("B", "x"));
    }

    @Test
    void testCycle() {
        String dsl = """
                table A
                    dim [a] = [b]
                    dim [b] = [a]
                """;

        ResultCollector data = executeWithErrors(dsl);
        Assertions.assertEquals("Cyclic dependency: A[a]", data.getError("A", "a"));
        Assertions.assertEquals("Cyclic dependency: A[a]", data.getError("A", "b"));
    }

    @Test
    void testDateFunction() {
        String dsl = """
                table A
                    dim [day] = RANGE(10)
                    [month] = [day] + 1
                    [year] = 2020
                    [date] = DATE([year], [month], [day])
                    [date2] = DATE(2020, [month], [day])
                    [invalidDate] = DATE([year], [month])
                    [invalidDate2] = DATE("2020", [month], [day])
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "year", 2020, 2020, 2020, 2020, 2020, 2020, 2020, 2020, 2020, 2020);
        data.verify("A", "month", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
        data.verify("A", "day", 0, 1, 2, 3, 4, 5, 6, 7, 8, 9);
        data.verify("A", "date", NaN, 43862, 43892, 43924, 43955, 43987, 44018, 44050, 44082, 44113);
        data.verify("A", "date2", NaN, 43862, 43892, 43924, 43955, 43987, 44018, 44050, 44082, 44113);

        Assertions.assertEquals("DATE function requires 3 arguments: DATE(YEAR, MONTH, DAY)",
                data.getError("A", "invalidDate"));
        Assertions.assertEquals("YEAR argument in DATE function must be a number",
                data.getError("A", "invalidDate2"));
    }

    @Test
    void testDateTimePartFunctions() {
        String dsl = """
                    table A
                       dim [row]          = INPUT("%s")
                           [date]         = [row][date]
                           [text]         = "44587"
                           [year]         = YEAR([date])
                           [invalidYear]  = YEAR([text])
                           [month]        = MONTH([date])
                           [invalidMonth] = MONTH([text])
                           [day]          = DAY([date])
                           [invalidDay]   = DAY()
                           [hour]         = HOUR([date])
                           [invalidHour]  = HOUR([date], [text], "2020")
                           [minute]       = MINUTE([date])
                           [second]       = SECOND([date])
                           
                """.formatted(TestInputs.DATE_TIME_CSV);

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "year", 2020, 2023, 1988, 1999, 2000, 2005);
        data.verify("A", "month", 3, 12, 1, 7, 5, 8);
        data.verify("A", "day", 21, 7, 3, 29, 30, 15);
        data.verify("A", "hour", 0, 17, 12, 22, 3, 23);
        data.verify("A", "minute", 37, 5, 40, 59, 0, 59);
        data.verify("A", "second", 28, 57, 3, 0, 59, 1);

        Assertions.assertEquals("YEAR function argument must be a number", data.getError("A", "invalidYear"));
        Assertions.assertEquals("MONTH function argument must be a number", data.getError("A", "invalidMonth"));
        Assertions.assertEquals("DAY requires single argument", data.getError("A", "invalidDay"));
        Assertions.assertEquals("HOUR requires single argument", data.getError("A", "invalidHour"));
    }

    @Test
    void testConcatenate() {
        String dsl = """
                table A
                    dim [a] = RANGE(5)
                        [b] = DATE(2020, 1, [a])
                        [c] = "AND"
                        [d] = 2.7
                        [e] = [a] > [d]
                        [concat] = CONCAT([a], " ", [b], [c], [d], " ", [e])
                        [concatenate] = CONCATENATE([a], " ", [b], [c], [d], " ", [e])
                        [concat2] = CONCAT([a])
                        [invalidConcat] = CONCAT()
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "concat", null, "1 43831.0AND2.7 FALSE", "2 43832.0AND2.7 FALSE",
                "3 43833.0AND2.7 TRUE", "4 43834.0AND2.7 TRUE");
        data.verify("A", "concatenate", null, "1 43831.0AND2.7 FALSE", "2 43832.0AND2.7 FALSE",
                "3 43833.0AND2.7 TRUE", "4 43834.0AND2.7 TRUE");
        data.verify("A", "concat2", "0", "1", "2", "3", "4");

        Assertions.assertEquals("CONCATENATE function requires at least one argument",
                data.getError("A", "invalidConcat"));
    }

    @Test
    void testText() {
        String dsl = """
                    table A
                       dim [row]          = INPUT("%s")
                           [rn]           = ROW()
                           [const]        = 2
                           [bool]         = [rn] > [const]
                           [date]         = [row][date]
                           [text1]         = TEXT(3.5)
                           [text2]         = TEXT([rn])
                           [text3]         = TEXT([date], "yyyy-MM-dd")
                           [text4]         = TEXT([date], "hh:mm:ss a")
                           [text5]         = TEXT([date])
                           [text6]         = TEXT([bool])
                           [textFormatted] = TEXT([const], "yyyy-MM-dd")
                           [textInvalid2]  = TEXT()
                           [textInvalid3]  = TEXT([rn], [bool])
                           
                """.formatted(TestInputs.DATE_TIME_CSV);

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "text1", "3.5", "3.5", "3.5", "3.5", "3.5", "3.5");
        data.verify("A", "text2", "0", "1", "2", "3", "4", "5");
        data.verify("A", "text3", "2020-03-21", "2023-12-07", "1988-01-03", "1999-07-29", "2000-05-30",
                "2005-08-15");
        data.verify("A", "text4", "12:37:28 AM", "05:05:57 PM", "12:40:03 PM", "10:59:00 PM", "03:00:59 AM",
                "11:59:01 PM");
        data.verify("A", "text5", "3/21/2020 12:37:28 AM", "12/7/2023 05:05:57 PM", "1/3/1988 12:40:03 PM",
                "7/29/1999 10:59:00 PM", "5/30/2000 03:00:59 AM", "8/15/2005 11:59:01 PM");
        data.verify("A", "text6", "FALSE", "FALSE", "FALSE", "TRUE", "TRUE", "TRUE");
        data.verify("A", "textFormatted", "1900-01-02", "1900-01-02", "1900-01-02", "1900-01-02",
                "1900-01-02", "1900-01-02");

        Assertions.assertEquals("TEXT function requires one mandatory argument and optional formatting for dates",
                data.getError("A", "textInvalid2"));
        Assertions.assertEquals("TEXT function allows only constant string formatting",
                data.getError("A", "textInvalid3"));
    }

    @Test
    void testValue() {
        String dsl = """
                table A
                    dim [a] = RANGE(5)
                        [b] = TEXT([a])
                        [c] = CONCAT([b], "text")
                        [d] = VALUE([a])
                        [e] = VALUE([b])
                        [f] = VALUE([c])
                """;

        ResultCollector collector = executeWithErrors(dsl);

        collector.verifyError("A", "d", "VALUE function requires one STRING argument");
        collector.verify("A", "e", 0, 1, 2, 3, 4);
        collector.verify("A", "f", NaN, NaN, NaN, NaN, NaN);
    }

    @Test
    void testIf() {
        String dsl = """
                table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        [c] = TEXT([a])
                        [d] = TEXT([b])
                        [e] = IF([a] < 2, [a], [b])
                        [f] = IF([a] < 2, [c], [d])
                        [g] = IF([a] < 2, [a], [c])
                """;

        ResultCollector collector = executeWithErrors(dsl);

        collector.verify("A", "e", 0, 1, 12, 13, 14);
        collector.verify("A", "f", "0", "1", "12.0", "13.0", "14.0");
        collector.verifyError("A", "g", "IF function requires left and right arguments to have same type");
    }

    @Test
    void testIfNa() {
        String dsl = """
                !manual()
                table A
                    [a] = NA
                    [b] = TEXT([a])
                    [c] = IFNA([a], 10)
                    [d] = IFNA([b], TEXT(10))
                    [e] = IFNA([a], [b])
                override
                [a]
                1
                2
                NA
                """;

        ResultCollector collector = executeWithErrors(dsl);

        collector.verify("A", "c", 1, 2, 10);
        collector.verify("A", "d", "1.0", "2.0", "10");
        collector.verifyError("A", "e", "IFNA function requires source and fallback arguments to have same type");
    }

    @Test
    void testIsNa() {
        String dsl = """
                !manual()
                table A
                    [a] = NA
                    [b] = TEXT([a])
                    [c] = ISNA([a])
                    [d] = ISNA([b])
                override
                [a]
                1
                2
                NA
                """;

        ResultCollector collector = executeWithErrors(dsl);

        collector.verify("A", "c", 0.0, 0.0, 1.0);
        collector.verify("A", "d", 0.0, 0.0, 1.0);
    }

    @Test
    void testAbs() {
        String dsl = """
                !manual()
                table A
                    [a] = NA
                    [b] = ABS([a])
                    [c] = ABS(TEXT([b]))
                override
                [a]
                -1
                -0
                0
                1
                NA
                """;

        ResultCollector collector = executeWithErrors(dsl);

        collector.verify("A", "b", 1.0, 0.0, 0.0, 1.0, NaN);
        collector.verifyError("A", "c", "ABS function requires DOUBLE argument");
    }

    @Test
    void testFalseScalarCycle() {
        String dsl = """
                    table A
                       [a] = 1
                       [b] = A.FILTER($[a]).FILTER($[a]).COUNT()
                       [c] = A.DISTINCTBY($[a]).DISTINCTBY($[b]).COUNT()
                       [d] = A.ORDERBY($[b]).ORDERBY($[c]).COUNT()
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testFalseCycle() {
        String dsl = """
                    table A
                      dim [a] = RANGE(1)
                          [b] = A.FILTER($[a]).FILTER($[a]).COUNT()
                          [c] = A.DISTINCTBY($[a]).DISTINCTBY($[b]).COUNT()
                          [d] = A.ORDERBY($[b]).ORDERBY($[c]).COUNT()
                """;

        executeWithoutErrors(dsl);
    }

    @Test
    void testDuplicatedTable() {
        String dsl = """
                table A
                    dim [a] = RANGE(5)
                    [b] = [a] + 5
                    
                table A
                    dim [a] = RANGE(10)
                        [c] = [a] + 7
                        
                table A
                    dim [a] = B.FILTER(1)
                        [c] = [a][country]
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verifyError("A", null, "Table names must be unique across the project, duplicated name: A");
        Assertions.assertEquals(0, data.getValues().size());
    }

    @Test
    void testDuplicatedField() {
        String dsl = """
                table A
                    dim [a] = RANGE(5)
                    [b] = [a] + 5
                    [b] = 10
                    [b] = "TEXT"
                    [c] = [a] + [b]
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verifyError("A", "b", "Table A contains duplicated field b");
        data.verifyError("A", "c", "Table A contains duplicated field b");
        data.verify("A", "a", 0, 1, 2, 3, 4);
    }

    @Test
    void testLeftFunction() {
        String dsl = """
                table A
                    dim [a] = RANGE(6)
                        [b] = "test"
                        [c] = LEFT([b], [a])
                        [d] = LEFT([b], NA)
                        [e] = LEFT([b], [b])
                        [f] = LEFT()
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "c", "", "t", "te", "tes", "test", "test");
        data.verify("A", "d", (String) null, null, null, null, null, null);

        data.verifyError("A", "e", "LEFT 2 argument must be numeric");
        data.verifyError("A", "f", "LEFT function requires 2 arguments");
    }

    @Test
    void testRightFunction() {
        String dsl = """
                table A
                    dim [a] = RANGE(6)
                        [b] = "test"
                        [c] = RIGHT([b], [a])
                        [d] = RIGHT([b], NA)
                        [e] = RIGHT([b], [b])
                        [f] = RIGHT()
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "c", "", "t", "st", "est", "test", "test");
        data.verify("A", "d", (String) null, null, null, null, null, null);

        data.verifyError("A", "e", "RIGHT 2 argument must be numeric");
        data.verifyError("A", "f", "RIGHT function requires 2 arguments");
    }

    @Test
    void testMidFunction() {
        String dsl = """
                table A
                    dim [a] = RANGE(6)
                        [x] = [a] + 1
                        [b] = "test"
                        [c] = MID([b], [a], [x])
                        [d] = MID([b], [a], 3)
                        [e] = MID([b], NA, [a])
                        [f] = MID([b], [b], [b])
                        [g] = MID()
                """;

        ResultCollector data = executeWithErrors(dsl);
        data.verify("A", "c", null, "te", "est", "st", "t", "");
        data.verify("A", "d", null, "tes", "est", "st", "t", "");
        data.verify("A", "e", (String) null, null, null, null, null, null);

        data.verifyError("A", "f", "MID 2 argument must be numeric");
        data.verifyError("A", "g", "MID function requires 3 arguments");
    }

    @Test
    void testSubstitute() {
        String dsl = """
                table A
                    dim [a] = RANGE(2)
                        [x] = "this is a test"
                        [y] = SUBSTITUTE(TEXT([a] + 10), TEXT([a]), "@")
                        [b] = SUBSTITUTE([x], "test", "text")
                        [f] = SUBSTITUTE([x], [x], [a])
                        [g] = SUBSTITUTE()
                """;

        ResultCollector data = executeWithErrors(dsl);
        //TODO fix when formatting and types will be done
        data.verify("A", "y", "1@.@", "@@.0");
        data.verify("A", "b", "this is a text", "this is a text");

        data.verifyError("A", "f", "SUBSTITUTE 3 argument must be string");
        data.verifyError("A", "g", "SUBSTITUTE function requires 3 arguments");
    }


    @Test
    void testMode() {
        String dsl = """
                table A
                    dim [a] = RANGE(7)
                        [b] = [a] MOD 3
                        [c] = TEXT([a])
                        [d] = TEXT([b])
                        [e] = MODE(A[a])
                        [f] = MODE(A[b])
                        [g] = MODE(A[c])
                        [h] = MODE(A[d])
                        
                table B
                    dim [a] = RANGE(5)
                        [rows] = A.FILTER($[a] > [a])
                        [b] = MODE([rows][b])
                        [c] = MODE([rows][d])
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "e", NaN, NaN, NaN, NaN, NaN, NaN, NaN);
        data.verify("A", "f", 0, 0, 0, 0, 0, 0, 0);
        data.verify("A", "g", (String) null, null, null, null, null, null, null);
        data.verify("A", "h", "0.0", "0.0", "0.0", "0.0", "0.0", "0.0", "0.0");

        data.verify("B", "b", 1, 2, 0, NaN, NaN);
        data.verify("B", "c", "1.0", "2.0", "0.0", null, null);
    }

    @Test
    void testCorrelation() {
        String dsl = """
                table A
                    dim [a] = RANGE(7)
                        [b] = [a] + 3
                        [c] = -[a]
                        [d] = [a] * 1.5
                        [e] = A.CORREL($[a], $[b])
                        [f] = A.CORREL($[a], $[c])
                        [g] = A.CORREL($[a], $[d])
                    override
                    row, [d]
                    1, 3
                    2, 1
                    3, 7
                    4, 5
                    5, -3
                    6, 9
                    7, -4
                        
                table B
                    dim [a] = RANGE(8)
                        [rows] = A.FILTER($[a] > [a])
                        [b] = [rows].CORREL($[a], $[b])
                        [c] = [rows].CORREL($[a], $[c])
                        [d] = [rows].CORREL($[a], $[d])
                """;

        ResultCollector data = executeWithoutErrors(dsl);
        data.verify("A", "e", 1, 1, 1, 1, 1, 1, 1);
        data.verify("A", "f", -1, -1, -1, -1, -1, -1, -1);
        data.verify("A", "g", -0.2364624979197869, -0.2364624979197869, -0.2364624979197869,
                -0.2364624979197869, -0.2364624979197869, -0.2364624979197869, -0.2364624979197869);

        data.verify("B", "b", 1.0000000000000009, 0.9999999999999999, 1.0,
                0.999999999999992, 1.0, NaN, NaN, NaN);
        data.verify("B", "c", -0.9999999999999999, -0.9999999999999999,
                -1.0, -0.9999999999999999, -1.0, NaN, NaN, NaN);
        data.verify("B", "d", -0.26939454265398016, -0.4797016118001234, -0.3077935056255462,
                -0.06911635163761368, -1.0, NaN, NaN, NaN);
    }
}
