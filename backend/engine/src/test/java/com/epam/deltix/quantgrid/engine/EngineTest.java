package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.cache.LocalCache;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.plan.ControllablePlan;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.local.CartesianLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.FilterLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.JoinAllLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.LoadLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RangeLocal;
import com.epam.deltix.quantgrid.engine.rule.ExecutionController;
import com.epam.deltix.quantgrid.engine.rule.ProjectionVerifier;
import com.epam.deltix.quantgrid.engine.test.PostOptimizationCallback;
import com.epam.deltix.quantgrid.engine.test.ResultCollector;
import com.epam.deltix.quantgrid.engine.test.TestExecutor;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.SneakyThrows;
import org.apache.commons.lang3.mutable.MutableInt;
import org.jetbrains.annotations.Nullable;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;
import java.util.concurrent.CancellationException;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.ThreadLocalRandom;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.locks.LockSupport;
import java.util.function.Consumer;
import java.util.stream.IntStream;

import static org.junit.jupiter.api.Assertions.assertEquals;

class EngineTest {

    @Test
    void testSingleThreadEngine() {
        Engine engine = TestExecutor.singleThreadEngine();
        ResultCollector data = new ResultCollector();

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [r] = A.FILTER(1).FILTER($[a]).FILTER($[b])
                """;

        Computation v1 = engine.compute(data, dslV1, null);
        v1.await(10, TimeUnit.SECONDS);

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [r] = A.FILTER(1).FILTER($[a]).FILTER($[b])
                        [a] = [r][a]
                        [b] = [r][b]
                """;

        Computation v2 = engine.compute(data, dslV2, null);
        v2.await(10, TimeUnit.SECONDS);

        data.verify("A", "a", 1, 2, 3, 4, 5);
        data.verify("A", "b", 11, 12, 13, 14, 15);

        data.verify("B", "a", 1, 2, 3, 4, 5);
        data.verify("B", "b", 11, 12, 13, 14, 15);
        data.verify("B", "r", 1, 2, 3, 4, 5);

        data.verifyTraces();
    }

    @Test
    void testCarryOnTableWithZeroColumns() {
        Engine engine = TestExecutor.singleThreadEngine();
        ResultCollector data = new ResultCollector();

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

        Computation v1 = engine.compute(data, dsl, null);

        v1.await(10, TimeUnit.SECONDS);

        Computation v2 = engine.compute(data, dsl, null);

        v2.await(10, TimeUnit.SECONDS);

        data.verify("B", "avg", 5.5);

        data.verifyTraces();
    }

    @Test
    void testMultiThreadEngine() {
        Engine engine = TestExecutor.multiThreadEngine();
        ResultCollector data = new ResultCollector();

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [r] = A.FILTER(1).FILTER($[a]).FILTER($[b])
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [r] = A.FILTER(1).FILTER($[a]).FILTER($[b])
                        [a] = [r][a]
                        [b] = [r][b]
                """;

        engine.compute(data, dslV1, null).await(10, TimeUnit.SECONDS);
        engine.compute(data, dslV2, null).await(10, TimeUnit.SECONDS);

        data.verify("A", "a", 1, 2, 3, 4, 5);
        data.verify("A", "b", 11, 12, 13, 14, 15);

        data.verify("B", "a", 1, 2, 3, 4, 5);
        data.verify("B", "b", 11, 12, 13, 14, 15);
        data.verify("B", "r", 1, 2, 3, 4, 5);

        data.verifyTraces();
    }

    @Test
    void testJoinCount() {
        ExecutionController controller = new ExecutionController(JoinAllLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);
        ResultCollector data = new ResultCollector();

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [c] = RANGE(6)
                        [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] = [c] AND $[a] <> [c]).COUNT()
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [c] = RANGE(6)
                        [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] = [c] AND $[a] <> [c]).COUNT()
                        [e] = [d] + 5
                """;

        Computation v1 = engine.compute(data, dslV1, null);
        controller.await();

        Computation v2 = engine.compute(data, dslV2, null);
        controller.release();

        v1.await(10, TimeUnit.SECONDS);
        v2.await(10, TimeUnit.SECONDS);

        data.verifyTraces();
    }

    @Test
    void testJoinDim() {
        ExecutionController controller = new ExecutionController(JoinAllLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);
        ResultCollector data = new ResultCollector();

        String dslV1 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [c] = RANGE(6)
                    dim [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] = [c] AND $[a] <> [c]).FILTER($[b])
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(5)
                        [b] = [a] + 10
                
                  table B
                    dim [c] = RANGE(6)
                    dim [d] = A.FILTER($[a] > 1 AND [c] > 2 AND $[b] = [c] AND $[a] <> [c]).FILTER($[b])
                        [e] = [d][b]
                """;

        Computation v1 = engine.compute(data, dslV1, null);
        controller.await();

        Computation v2 = engine.compute(data, dslV2, null);
        controller.release();

        v1.await(10, TimeUnit.SECONDS);
        v2.await(10, TimeUnit.SECONDS);

        data.verifyTraces();
    }

    @Test
    void testReuseProjection() {
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);
        ResultCollector data = new ResultCollector();

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

        engine.compute(data, dslV1, null).await(10, TimeUnit.SECONDS);
        verifier.disable();
        engine.compute(data, dslV2, null).await(10, TimeUnit.SECONDS);
        engine.compute(data, dslV2, null).await(10, TimeUnit.SECONDS); // should be optimized later

        data.verifyTraces();
    }

    @Test
    void testEmptyGraphExecution() {
        Engine engine = TestExecutor.multiThreadEngine();
        ResultCollector data = new ResultCollector();
        engine.compute(data, "", null).await(1, TimeUnit.SECONDS);
        data.verifyTraces();
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
        assertEquals("Invalid argument \"count\" for function RANGE: expected an integer number.",
                data.getError("A", "a"));
        assertEquals("Invalid argument \"count\" for function RANGE: expected an integer number.",
                data.getError("A", "b"));
        data.verify("B", "a", 1, 2, 3);
        data.verify("B", "b", 4, 5, 6);

        data.verifyTraces();
    }

    @Test
    void testRunningNodeReuse() {
        ExecutionController controller = new ExecutionController(FilterLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);
        ResultCollector data = new ResultCollector();

        String dsl = """
                table t1
                    dim [a] = RANGE(5)
                        [b] = [a] + 3
                
                table t2
                    dim [x] = t1.FILTER($[a] > 4)
                        [b] = [x][b]
                """;

        Computation v1 = engine.compute(data, dsl, null);

        Set<ControllablePlan> controllablePlans = controller.getControllablePlans();
        Assertions.assertEquals(1, controllablePlans.size());
        controller.await();

        Computation v2 = engine.compute(data, dsl, null);
        controller.release();

        v1.await(10, TimeUnit.SECONDS);
        v2.await(10, TimeUnit.SECONDS);

        data.verify("t1", "a", 1, 2, 3, 4, 5);
        data.verify("t1", "b", 4, 5, 6, 7, 8);

        data.verify("t2", "x", 5);
        data.verify("t2", "b", 8);

        data.verifyTraces();
    }

    @Test
    void testExecutedNodeReuse() {
        VerifyNodeCount nodesCountVerification = new VerifyNodeCount(Executed.class);
        Engine engine = TestExecutor.singleThreadEngine(nodesCountVerification);
        ResultCollector data = new ResultCollector();

        String dsl = """
                table t1
                    dim [a] = RANGE(3)
                    dim [b] = RANGE(2)
                        [c] = [a] + [b]
                
                table t2
                    dim [x] = RANGE(1)
                        [f] = t1.FILTER([x] < $[c]).COUNT()
                """;

        Computation v1 = engine.compute(data, dsl, null);
        v1.await(10, TimeUnit.SECONDS);
        assertEquals(0, nodesCountVerification.count.intValue());

        Computation v2 = engine.compute(data, dsl, null);
        v2.await(10, TimeUnit.SECONDS);
        // verify that optimized graph contains 3 executed nodes: cartesian, nestedCount, range
        assertEquals(3, nodesCountVerification.count.intValue());

        data.verify("t1", "a", 1, 1, 2, 2, 3, 3);
        data.verify("t1", "b", 1, 2, 1, 2, 1, 2);
        data.verify("t1", "c", 2, 3, 3, 4, 4, 5);

        data.verify("t2", "x", 1);
        data.verify("t2", "f", 6);

        data.verifyTraces();
    }

    @Test
    void testCachedNodesReusedWithCorrectMapping() {
        VerifyNodeCount executed = new VerifyNodeCount(Executed.class);
        Engine engine = TestExecutor.singleThreadEngine(executed);
        ResultCollector data = new ResultCollector();

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

        Computation v1 = engine.compute(data, dsl1, null);
        v1.await(5, TimeUnit.SECONDS);

        // filter and cartesian
        assertEquals(10, engine.getCache().size());
        // no Executed nodes in a graph
        assertEquals(0, executed.count.intValue());

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

        Computation v2 = engine.compute(data, dsl2, null);
        v2.await(5, TimeUnit.SECONDS);

        assertEquals(8, engine.getCache().size());
        assertEquals(2, executed.count.intValue());

        data.verify("A", "a", 1, 1, 2, 2, 3, 3);
        data.verify("A", "b", 1, 2, 1, 2, 1, 2);

        data.verify("B", "r", 1, 2, 3, 4, 5, 6);
        data.verify("B", "a", 1, 1, 2, 2, 3, 3);
        data.verify("B", "b", 1, 2, 1, 2, 1, 2);

        Computation v3 = engine.compute(data, dsl1, null);
        v3.await(5, TimeUnit.SECONDS);
        assertEquals(8, engine.getCache().size());
        assertEquals(5, executed.count.intValue());

        data.verifyTraces();
    }

    @Test
    void testCacheCleanUp() {
        Engine engine = TestExecutor.singleThreadEngine();
        ResultCollector data = new ResultCollector();

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

        Computation v1 = engine.compute(data, dsl, null);
        v1.await(5, TimeUnit.SECONDS);

        // assert that cache contains exactly 4 plans
        assertEquals(5, engine.getCache().size());

        data.verify("A", "a", 1, 2, 3, 4, 5);
        data.verify("A", "b", 11, 12, 13, 14, 15);

        data.verify("B", "r", 2, 3, 4, 5);
        data.verify("B", "c", 0, 0, 0, 0);
        data.verify("B", "a", 2, 3, 4, 5);
        data.verify("B", "b", 12, 13, 14, 15);

        String dsl2 = """
                  table A
                    dim [a] = RANGE(5)
                """;

        Computation v2 = engine.compute(data, dsl2, null);
        v2.await(5, TimeUnit.SECONDS);

        // assert cache clean up
        assertEquals(1, engine.getCache().size());
        data.verifyTraces();
    }

    @Test
    void testViewportCleanUp() {
        Engine engine = TestExecutor.singleThreadEngine();
        ResultCollector data = new ResultCollector();

        String dsl = """
                  table A
                    dim [a] = RANGE(10)
                        [b] = [a] + 10
                
                  table B
                    dim [c] = A.FILTER($[a] > 5)
                        [d] = [c][a]
                        [e] = [c][b]
                """;

        engine.compute(data, dsl, null, new FieldKey("B", "c"),
                new FieldKey("B", "d"), new FieldKey("B", "e")).await(10, TimeUnit.SECONDS);
        assertEquals(4, engine.getCache().size());

        engine.compute(data, dsl, null,
                new FieldKey("A", "a"), new FieldKey("A", "b")).await(10, TimeUnit.SECONDS);
        assertEquals(4, engine.getCache().size());

        engine.compute(data, dsl, null, new FieldKey("A", "a"),
                new FieldKey("A", "b"), new FieldKey("B", "c"),
                new FieldKey("B", "d"), new FieldKey("B", "e")).await(10, TimeUnit.SECONDS);
        assertEquals(4, engine.getCache().size());

        data.verifyTraces();
    }

    @Test
    void testFirstComputationCanceled() {
        ExecutionController controller = new ExecutionController(CartesianLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dslV1 = """
                  table A
                    dim [a] = RANGE(3)
                        [b] = A.FILTER([a] > A[a]).COUNT()
                """;

        String dslV2 = """
                  table A
                    dim [a] = RANGE(3)
                """;

        ResultCollector data1 = new ResultCollector();
        Computation v1 = engine.compute(data1, dslV1, null);
        controller.await();

        ResultCollector data2 = new ResultCollector();
        Computation v2 = engine.compute(data2, dslV2, null);

        v1.cancel();
        controller.release();

        Assertions.assertThrows(CancellationException.class, () -> v1.await(10, TimeUnit.SECONDS));
        v2.await(10, TimeUnit.SECONDS);

        data2.verify("A", "a", "1", "2", "3");
        data2.verifyTraces();
    }

    @Test
    void testReuseAcrossSameComputations() {
        ExecutionController controller = new ExecutionController(CartesianLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dsl = """
                  table A
                    dim [a] = RANGE(3)
                        [b] = A.FILTER([a] > A[a]).COUNT()
                """;

        ResultCollector data1 = new ResultCollector();
        Computation v1 = engine.compute(data1, dsl, null);
        controller.await();

        ResultCollector data2 = new ResultCollector();
        Computation v2 = engine.compute(data2, dsl, null);

        ResultCollector data3 = new ResultCollector();
        Computation v3 = engine.compute(data3, dsl, null);

        controller.release();
        v1.await(10, TimeUnit.SECONDS);
        v2.await(10, TimeUnit.SECONDS);
        v3.await(10, TimeUnit.SECONDS);

        data1.verify("A", "a", "1", "2", "3");
        data1.verify("A", "b", "0", "1", "2");
        data1.verifyTraces();

        data2.verify("A", "a", "1", "2", "3");
        data2.verify("A", "b", "0", "1", "2");
        data2.verifyTraces();

        data3.verify("A", "a", "1", "2", "3");
        data3.verify("A", "b", "0", "1", "2");
        data3.verifyTraces();
    }

    @Test
    void testConcurrentComputationsWithSameDsl() throws Exception {
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);
        LocalCache cache = (LocalCache) engine.getCache();

        String dsl = """
                  table A
                     dim [a] = RANGE(100)
                         [b] = A.FILTER([a] > A[a]).COUNT()
                         [c] = A.FILTER([a] = A[a]).COUNT()
                """;

        ExecutorService executor = Executors.newFixedThreadPool(8);

        List<Future<?>> futures = new ArrayList<>();
        ResultCollector[] results = new ResultCollector[32];
        Computation[] computations = new Computation[results.length];

        String[] a = IntStream.rangeClosed(1, 100).mapToObj(Integer::toString).toArray(String[]::new);
        String[] b = IntStream.rangeClosed(1, 100).map(i -> i - 1).mapToObj(Integer::toString).toArray(String[]::new);
        String[] c = IntStream.rangeClosed(1, 100).map(i -> 1).mapToObj(Integer::toString).toArray(String[]::new);

        for (int j = 0; j < results.length; j++) {
            int i = j;
            Future<?> future = executor.submit(() -> {
                results[i] = new ResultCollector();
                computations[i] = engine.compute(results[i], dsl, null);

                ThreadLocalRandom random = ThreadLocalRandom.current();
                switch (random.nextInt(0, 4)) {
                    case 0:
                        // nothing
                        break;
                    case 1:
                        Thread.yield();
                        break;
                    case 2:
                        LockSupport.parkNanos(random.nextInt(0, 4_000_000));
                        break;
                    case 3:
                        cache.clear();
                        break;
                }
            });
            futures.add(future);
        }

        for (int i = 0; i < results.length; i++) {
            futures.get(i).get(15, TimeUnit.SECONDS);
            computations[i].await(15, TimeUnit.SECONDS);
            results[i].verify("A", "a", a);
            results[i].verify("A", "b", b);
            results[i].verify("A", "c", c);
            results[i].verifyTraces();
        }
    }

    @Test
    void testRecursiveCancellation()  {
        ExecutionController controller = new ExecutionController(CartesianLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        Engine engine = TestExecutor.multiThreadEngine(new PostOptimizationCallback(controller, verifier));

        String dsl = """
                table A
                  dim [a] = RANGE(5)
                      [b] = SUM(A[a] + [a])
                """;

        CompletableFuture<Computation> future = new CompletableFuture<>();
        ResultListener callback = new ResultListener() {
            @Override
            @SneakyThrows
            public void onUpdate(ParsedKey key, long start, long end, boolean content, boolean raw,
                                 @Nullable Table value, @Nullable String error, @Nullable ResultType resultType) {
                Computation computation = future.get(5, TimeUnit.SECONDS);
                computation.cancel();
                controller.release();
            }
        };
        Computation computation = engine.compute(callback, dsl, null);
        future.complete(computation);
        Assertions.assertThrows(CancellationException.class, () -> computation.await(5, TimeUnit.SECONDS));
    }

    @Test
    void testPartialCancellation()  {
        ExecutionController controller = new ExecutionController(RangeLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        PostOptimizationCallback callback = new PostOptimizationCallback(controller, verifier);
        Engine engine = TestExecutor.multiThreadEngine(callback);

        String dsl = """
                table A
                      [a] = 5
                  dim [b] = RANGE([a])
                      [c] = SUM(A[a])
                      [d] = COUNT(A[a])
                """;

        ResultCollector data = new ResultCollector();

        Computation computation = engine.compute(data, dsl, null);
        controller.await();
        computation.cancel(Set.of(new FieldKey("A", "b"), new FieldKey("A", "d")));
        controller.release();
        computation.await(5, TimeUnit.SECONDS);

        data.verifyTraces();
        data.verify("""
                Table: A
                +---+----+
                | a |  c |
                +---+----+
                | 5 | 25 |
                | 5 | 25 |
                | 5 | 25 |
                | 5 | 25 |
                | 5 | 25 |
                +---+----+
                """);
    }

    @Test
    void testResultsLoaded() {
        VerifyNodeCount persisted = new VerifyNodeCount(LoadLocal.class);
        Engine engine = TestExecutor.singleThreadEngine(persisted, plan -> true);
        ResultCollector data = new ResultCollector();
        String dsl = """
                table A
                  dim [a] = RANGE(10)
                      [b] = [a] + 10
                
                table B
                  dim [c] = A.FILTER($[a] > 5)
                      [d] = [c][a]
                      [e] = [c][b]
                """;
        Consumer<ResultCollector> resultVerifier = resultCollector -> {
            resultCollector.verify("A", "a", 1, 2, 3, 4, 5, 6, 7, 8, 9, 10);
            resultCollector.verify("A", "b", 11, 12, 13, 14, 15, 16, 17, 18, 19, 20);

            resultCollector.verify("B", "c", 6, 7, 8, 9, 10);
            resultCollector.verify("B", "d", 6, 7, 8, 9, 10);
            resultCollector.verify("B", "e", 16, 17, 18, 19, 20);
        };

        Computation v1 = engine.compute(data, dsl, null);
        v1.await(5, TimeUnit.SECONDS);

        assertEquals(0, persisted.count.intValue());

        resultVerifier.accept(data);

        ((LocalCache) engine.getCache()).clear();
        Computation v2 = engine.compute(data, dsl, null);
        v2.await(5, TimeUnit.SECONDS);

        assertEquals(2, persisted.count.intValue());

        resultVerifier.accept(data);
        data.verifyTraces();
    }

    @Test
    void testSharedMode() {
        ExecutionController controller = new ExecutionController(RangeLocal.class);
        ProjectionVerifier verifier = new ProjectionVerifier();
        Engine engine = TestExecutor.multiThreadEngine(new PostOptimizationCallback(controller, verifier));

        ResultCollector data1 = new ResultCollector();
        ResultCollector data2 = new ResultCollector();

        String dsl = """
                table A
                  dim [a] = RANGE(5)
                      [b] = SUM(A[a] + [a])
                      [c] = 1
                """;


        Computation computation1 = engine.compute(data1, dsl, null, true);
        controller.await();

        Computation computation2 = engine.compute(data2, dsl, null, true, new FieldKey("A", "c"));
        controller.release();

        computation1.await(5, TimeUnit.SECONDS);
        computation2.await(5, TimeUnit.SECONDS);

        data1.verifyTraces();
        data1.verify("""
                Table: A
                +---+----+---+
                | a |  b | c |
                +---+----+---+
                | 1 | 20 | 1 |
                | 2 | 25 | 1 |
                | 3 | 30 | 1 |
                | 4 | 35 | 1 |
                | 5 | 40 | 1 |
                +---+----+---+
                """);

        data2.verifyTraces();
        data2.verify("""
                Table: A
                +---+----+---+
                | a |  b | c |
                +---+----+---+
                | 1 | 20 | 1 |
                | 2 | 25 | 1 |
                | 3 | 30 | 1 |
                | 4 | 35 | 1 |
                | 5 | 40 | 1 |
                +---+----+---+
                """);
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
