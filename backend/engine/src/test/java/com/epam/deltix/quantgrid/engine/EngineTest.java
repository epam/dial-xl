package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.plan.ControllablePlan;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimplePivotLocal;
import com.epam.deltix.quantgrid.engine.rule.ExecutionController;
import com.epam.deltix.quantgrid.engine.rule.ProjectionVerifier;
import com.epam.deltix.quantgrid.engine.test.PostOptimizationCallback;
import com.epam.deltix.quantgrid.engine.test.ResultCollector;
import com.epam.deltix.quantgrid.engine.test.TestExecutor;
import com.epam.deltix.quantgrid.parser.FieldKey;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import org.apache.commons.lang3.mutable.MutableInt;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.Set;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.TimeoutException;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EngineTest {

    @Test
    void testSingleThreadEngine() throws ExecutionException, InterruptedException, TimeoutException {
        Engine engine = TestExecutor.singleThreadEngine();

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [r] = A.FILTER($[a]).FILTER($[b])
                """;

        CompletableFuture<Void> v1 = engine.compute(dslV1, null);

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [r] = A.FILTER($[a]).FILTER($[b])
                        [a] = [r][a]
                        [b] = [r][b]
                """;

        CompletableFuture<Void> v2 = engine.compute(dslV2, null);

        v1.get(10, TimeUnit.SECONDS);
        v2.get(10, TimeUnit.SECONDS);

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("A", "a", 1, 2, 3, 4, 5);
        data.verify("A", "b", 11, 12, 13, 14, 15);

        data.verify("B", "a", 1, 2, 3, 4, 5);
        data.verify("B", "b", 11, 12, 13, 14, 15);
        data.verify("B", "r", 1, 2, 3, 4, 5);
    }

    @Test
    void testCarryOnTableWithZeroColumns() throws ExecutionException, InterruptedException, TimeoutException {
        Engine engine = TestExecutor.singleThreadEngine();

        String dsl = """
                table A
                  dim [a] = RANGE(10)
                apply  # Triggers carry rule by adding a projection node
                sort [a]

                table B
                  [avg] = AVERAGE(A[a])
                apply  # Applies sort on a scalar table with 0 columns
                sort [avg]
                """;

        CompletableFuture<Void> v1 = engine.compute(dsl, null);

        v1.get(10, TimeUnit.SECONDS);

        CompletableFuture<Void> v2 = engine.compute(dsl, null);

        v2.get(10, TimeUnit.SECONDS);

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("B", "avg", 5.5);
    }

    @Test
    void testMultiThreadEngine() throws ExecutionException, InterruptedException, TimeoutException {
        Engine engine = TestExecutor.multiThreadEngine();

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [r] = A.FILTER($[a]).FILTER($[b])
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [r] = A.FILTER($[a]).FILTER($[b])
                        [a] = [r][a]
                        [b] = [r][b]
                """;

        engine.compute(dslV1, null).get(10, TimeUnit.SECONDS);
        engine.compute(dslV2, null).get(10, TimeUnit.SECONDS);

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("A", "a", 1, 2, 3, 4, 5);
        data.verify("A", "b", 11, 12, 13, 14, 15);

        data.verify("B", "a", 1, 2, 3, 4, 5);
        data.verify("B", "b", 11, 12, 13, 14, 15);
        data.verify("B", "r", 1, 2, 3, 4, 5);
    }

    @Test
    void testSimplePivot() throws Exception {
        VerifyNodeCount pivots = new VerifyNodeCount(SimplePivotLocal.class);
        Engine engine = TestExecutor.multiThreadEngine(pivots);

        String dslV1 = """
                  !manual()
                  table A
                    [a] = NA
                    [b] = NA
                    override
                    [a], [b]
                    1, "Spain"
                    2, "UK"
                    3, "USA"
                    4, "Spain"
                    5, "USA"
                        
                  table B
                        [*] = A.PIVOT($[b], SUM($[a]))
                        [spain] = [Spain]
                        [uk] = [UK]
                        [usa] = [USA]
                """;

        engine.compute(dslV1, null).get(10, TimeUnit.SECONDS);
        assertEquals(1, pivots.count.intValue());

        engine.compute(dslV1, null).get(10, TimeUnit.SECONDS);
        assertEquals(1, pivots.count.intValue());

        ResultCollector collector = (ResultCollector) engine.getListener();
        collector.verify("B", "spain", 5);
        collector.verify("B", "uk", 2);
        collector.verify("B", "usa", 8);
    }

    @Test
    void testJoinCount() throws Exception {
        ExecutionController controller = new ExecutionController(JoinAllLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = RANGE(6)
                        [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] == [c] AND $[a] <> [c]).COUNT()
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = RANGE(6)
                        [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] == [c] AND $[a] <> [c]).COUNT()
                        [e] = [d] + 5
                """;

        CompletableFuture<Void> v1 = engine.compute(dslV1, null);
        controller.await();

        CompletableFuture<Void> v2 = engine.compute(dslV2, null);
        controller.release();

        Assertions.assertTrue(v1.isCancelled());
        Assertions.assertThrows(CancellationException.class, () -> v1.getNow(null));
        v2.get(10, TimeUnit.SECONDS);

        CompletableFuture<Void> v3 = engine.compute(dslV2, null);
        v3.get(10, TimeUnit.SECONDS);
    }

    @Test
    void testJoinDim() throws Exception {
        ExecutionController controller = new ExecutionController(JoinAllLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = RANGE(6)
                    dim [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] == [c] AND $[a] <> [c])
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = RANGE(6)
                    dim [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] == [c] AND $[a] <> [c])
                        [e] = [d][b]
                """;

        CompletableFuture<Void> v1 = engine.compute(dslV1, null);
        controller.await();

        CompletableFuture<Void> v2 = engine.compute(dslV2, null);
        controller.release();

        Assertions.assertTrue(v1.isCancelled());
        Assertions.assertThrows(CancellationException.class, () -> v1.getNow(null));
        v2.get(10, TimeUnit.SECONDS);
    }

    @Test
    void testReuseProjection() throws Exception {
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = A.FILTER($[a])
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = A.FILTER($[a])
                        [d] = [c][b]
                """;

        engine.compute(dslV1, null).get(10, TimeUnit.SECONDS);
        verifier.disable();
        engine.compute(dslV2, null).get(10, TimeUnit.SECONDS);
        engine.compute(dslV2, null).get(10, TimeUnit.SECONDS); // should be optimized later
    }

    @Test
    void testEmptyGraphExecution() throws Exception {
        Engine engine = TestExecutor.multiThreadEngine();
        engine.compute("", null).get(1, TimeUnit.SECONDS);
    }

    @Test
    void testPartiallyInvalidSheet() {
        String dsl = """
                  table A
                    dim [a] = RANGE("text")
                        [b] = [a] + 10
                        
                  table B
                    dim [a] = RANGE(3)
                        [b] = [a] + 3
                """;

        ResultCollector data = TestExecutor.executeWithErrors(dsl);
        assertEquals("Invalid function RANGE argument \"count\": expected value of type INTEGER", data.getError("A", "a"));
        assertEquals("Invalid function RANGE argument \"count\": expected value of type INTEGER", data.getError("A", "b"));
        data.verify("B", "a", 1, 2, 3);
        data.verify("B", "b", 4, 5, 6);
    }

    @Test
    void testRunningNodeReuse() throws Exception {
        ExecutionController controller = new ExecutionController(FilterLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dsl = """
                table t1
                    dim [a] = RANGE(5)
                        [b] = [a] + 3
                        
                table t2
                    dim [x] = t1.FILTER($[a] > 4)
                        [b] = [x][b]
                """;

        CompletableFuture<Void> v1 = engine.compute(dsl, null);

        Set<ControllablePlan> controllablePlans = controller.getControllablePlans();
        Assertions.assertEquals(1, controllablePlans.size());
        controller.await();

        CompletableFuture<Void> v2 = engine.compute(dsl, null);
        controller.release();

        Assertions.assertTrue(v1.isCancelled());
        Assertions.assertThrows(CancellationException.class, () -> v1.getNow(null));
        v2.get(10, TimeUnit.SECONDS);

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("t1", "a", 1, 2, 3, 4, 5);
        data.verify("t1", "b", 4, 5, 6, 7, 8);

        data.verify("t2", "x", 5);
        data.verify("t2", "b", 8);
    }

    @Test
    void testExecutedNodeReuse() throws ExecutionException, InterruptedException, TimeoutException {
        VerifyNodeCount nodesCountVerification = new VerifyNodeCount(Executed.class);
        Engine engine = TestExecutor.singleThreadEngine(nodesCountVerification);

        String dsl = """
                table t1
                    dim [a] = RANGE(3)
                    dim [b] = RANGE(2)
                        [c] = [a] + [b]
                        
                table t2
                    dim [x] = RANGE(1)
                        [f] = t1.FILTER([x] < $[c]).COUNT()
                """;

        CompletableFuture<Void> v1 = engine.compute(dsl, null);
        assertEquals(0, nodesCountVerification.count.intValue());

        CompletableFuture<Void> v2 = engine.compute(dsl, null);

        // verify that optimized graph contains 3 executed nodes: cartesian, nestedCount, range
        assertEquals(3, nodesCountVerification.count.intValue());

        v1.get(10, TimeUnit.SECONDS);
        v2.get(10, TimeUnit.SECONDS);

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("t1", "a", 1, 1, 2, 2, 3, 3);
        data.verify("t1", "b", 1, 2, 1, 2, 1, 2);
        data.verify("t1", "c", 2, 3, 3, 4, 4, 5);

        data.verify("t2", "x", 1);
        data.verify("t2", "f", 6);
    }

    @Test
    void testCachedNodesReusedWithCorrectMapping() throws ExecutionException, InterruptedException, TimeoutException {
        VerifyNodeCount executed = new VerifyNodeCount(Executed.class);
        Engine engine = TestExecutor.singleThreadEngine(executed);

        String dsl1 = """
                  table A
                    dim [a] = RANGE(3)
                    dim [b] = RANGE(2)
                        [c] = [a] + 5
                        
                  table B
                    dim [r] = A.FILTER(1)
                        [a] = [r][a]
                        [b] = [r][b]
                        [c] = [r][c]
                """;

        CompletableFuture<Void> v1 = engine.compute(dsl1, null);
        v1.get(5, TimeUnit.SECONDS);

        // filter and cartesian
        assertEquals(10, engine.getCache().size());
        // no Executed nodes in a graph
        assertEquals(0, executed.count.intValue());

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("A", "a", 1, 1, 2, 2, 3, 3);
        data.verify("A", "b", 1, 2, 1, 2, 1, 2);
        data.verify("A", "c", 6, 6, 7, 7, 8, 8);

        data.verify("B", "r", 1, 2, 3, 4, 5, 6);
        data.verify("B", "a", 1, 1, 2, 2, 3, 3);
        data.verify("B", "b", 1, 2, 1, 2, 1, 2);
        data.verify("B", "c", 6, 6, 7, 7, 8, 8);

        // reduce cartesian schema
        String dsl2 = """
                  table A
                    dim [a] = RANGE(3)
                    dim [b] = RANGE(2)
                        
                  table B
                    dim [r] = A.FILTER(1)
                        [a] = [r][a]
                        [b] = [r][b]
                """;

        CompletableFuture<Void> v2 = engine.compute(dsl2, null);
        v2.get(5, TimeUnit.SECONDS);

        assertEquals(8, engine.getCache().size());
        assertEquals(2, executed.count.intValue());

        data.verify("A", "a", 1, 1, 2, 2, 3, 3);
        data.verify("A", "b", 1, 2, 1, 2, 1, 2);

        data.verify("B", "r", 1, 2, 3, 4, 5, 6);
        data.verify("B", "a", 1, 1, 2, 2, 3, 3);
        data.verify("B", "b", 1, 2, 1, 2, 1, 2);

        CompletableFuture<Void> v3 = engine.compute(dsl1, null);
        v3.get(5, TimeUnit.SECONDS);
        assertEquals(8, engine.getCache().size());
        assertEquals(5, executed.count.intValue());
    }

    @Test
    void testCacheCleanUp() throws ExecutionException, InterruptedException, TimeoutException {
        Engine engine = TestExecutor.singleThreadEngine();

        String dsl = """
                  table A
                    # RangeLocal
                    dim [a] = RANGE(5)
                    # RangeLocal + scalar
                        [b] = [a] + 10
                        
                  table B
                    # Filter1
                    dim [r] = A.FILTER($[a] > 1)
                        # Filter1 as layout + aggregation plan as dependent
                        [c] = A.FILTER($[b] < [r][a]).COUNT()
                        # Filter1
                        [a] = [r][a]
                        # Filter1
                        [b] = [r][b]
                """;

        CompletableFuture<Void> v1 = engine.compute(dsl, null);
        v1.get(5, TimeUnit.SECONDS);

        // assert that cache contains exactly 4 plans
        assertEquals(5, engine.getCache().size());

        ResultCollector data = (ResultCollector) engine.getListener();
        data.verify("A", "a", 1, 2, 3, 4, 5);
        data.verify("A", "b", 11, 12, 13, 14, 15);

        data.verify("B", "r", 2, 3, 4, 5);
        data.verify("B", "c", 0, 0, 0, 0);
        data.verify("B", "a", 2, 3, 4, 5);
        data.verify("B", "b", 12, 13, 14, 15);

        CompletableFuture<Void> v2 = engine.compute("", null);
        v2.get(5, TimeUnit.SECONDS);

        // assert cache clean up
        assertEquals(0, engine.getCache().size());
    }

    @Test
    void testViewportCleanUp() throws Exception {
        Engine engine = TestExecutor.singleThreadEngine();

        String dsl = """
                  table A
                    dim [a] = RANGE(10)
                        [b] = [a] + 10
                        
                  table B
                    dim [c] = A.FILTER($[a] > 5)
                        [d] = [c][a]
                        [e] = [c][b]
                """;

        engine.compute(dsl, null, new FieldKey("B", "c"), new FieldKey("B", "d"),
                new FieldKey("B", "e")).get(10, TimeUnit.SECONDS);
        assertEquals(4, engine.getCache().size());

        engine.compute(dsl, null, new FieldKey("A", "a"),
                new FieldKey("A", "b")).get(10, TimeUnit.SECONDS);
        assertEquals(4, engine.getCache().size());

        engine.compute(dsl, null, new FieldKey("A", "a"), new FieldKey("A", "b"),
                new FieldKey("B", "c"), new FieldKey("B", "d"),
                new FieldKey("B", "e")).get(10, TimeUnit.SECONDS);
        assertEquals(4, engine.getCache().size());
    }

    @RequiredArgsConstructor
    private static class VerifyNodeCount implements GraphCallback {

        private final Class<?> clazz;

        @Getter
        private final MutableInt count = new MutableInt();

        @Override
        public void onOptimized(Graph graph) {
            graph.getNodes().forEach(node -> {
                if (clazz.isInstance(node)) {
                    count.increment();
                }
            });
        }
    }
}
