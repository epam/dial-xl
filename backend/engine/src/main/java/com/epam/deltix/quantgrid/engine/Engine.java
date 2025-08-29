package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.compiler.Compilation;
import com.epam.deltix.quantgrid.engine.compiler.Compiler;
import com.epam.deltix.quantgrid.engine.executor.ExecutionHandler;
import com.epam.deltix.quantgrid.engine.executor.Executor;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.NodeUtil;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.plan.Executed;
import com.epam.deltix.quantgrid.engine.node.plan.Failed;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.ResultPlan;
import com.epam.deltix.quantgrid.engine.node.plan.Running;
import com.epam.deltix.quantgrid.engine.node.plan.local.CacheLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.IndexResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.LoadLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.RetrieverResultLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimilaritySearchLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.StoreLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.rule.AssignStore;
import com.epam.deltix.quantgrid.engine.rule.AssignTrace;
import com.epam.deltix.quantgrid.engine.rule.Cancel;
import com.epam.deltix.quantgrid.engine.rule.Carry;
import com.epam.deltix.quantgrid.engine.rule.Clean;
import com.epam.deltix.quantgrid.engine.rule.Deduplicate;
import com.epam.deltix.quantgrid.engine.rule.Duplicate;
import com.epam.deltix.quantgrid.engine.rule.Merge;
import com.epam.deltix.quantgrid.engine.rule.Reduce;
import com.epam.deltix.quantgrid.engine.rule.Reuse;
import com.epam.deltix.quantgrid.engine.rule.UniteAggregation;
import com.epam.deltix.quantgrid.engine.rule.UniteJoin;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.engine.store.Store;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ParsedTotal;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import it.unimi.dsi.fastutil.longs.Long2IntOpenHashMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import it.unimi.dsi.fastutil.longs.LongArrayList;
import it.unimi.dsi.fastutil.longs.LongList;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.TestOnly;
import org.slf4j.event.Level;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicLong;
import java.util.concurrent.locks.ReentrantLock;
import java.util.function.Predicate;

@Slf4j
public class Engine implements ExecutionHandler {

    private final Long2ObjectMap<Computation> computations = new Long2ObjectOpenHashMap<>();
    private final AtomicLong ids = new AtomicLong();
    private final ReentrantLock lock = new ReentrantLock();
    private final ExecutorService notifier = Executors.newSingleThreadExecutor();

    private final Cache cache;
    private final Executor executor;
    @Getter
    private final InputProvider inputProvider;
    private final GraphCallback graphCallback;
    private final Store store;
    private final Predicate<Plan> toStore;

    public Engine(Cache cache,
                  ExecutorService service,
                  ExecutorService indexService,
                  GraphCallback graphCallback,
                  InputProvider inputProvider,
                  Store store,
                  Predicate<Plan> toStore) {
        this.cache = cache;
        this.executor = new Executor(lock, service, indexService, this);
        this.graphCallback = graphCallback;
        this.inputProvider = inputProvider;
        this.store = store;
        this.toStore = toStore;
    }

    public Computation compute(ResultListener handler,
                               List<ParsedSheet> sheets,
                               Collection<Viewport> viewports,
                               SimilarityRequest search,
                               Principal principal,
                               boolean profile,
                               boolean index,
                               boolean shared) {
        long computationId = ids.incrementAndGet();
        handler.onParsing(sheets);
        ComputationType type = shared ? ComputationType.CONDITIONAL : ComputationType.OPTIONAL;
        Compiler compiler = new Compiler(inputProvider, principal, computationId, type);
        Compilation compilation = compiler.compile(sheets, viewports, index, search);
        Graph graph = compilation.graph();
        handler.onCompilation(compilation);
        return compute(graph, handler, computationId, profile);
    }

    @TestOnly
    public Cache getCache() {
        return cache;
    }

    @TestOnly
    public Computation compute(ResultListener handler, String dsl, Principal principal) {
        return compute(handler, dsl, principal, false);
    }

    @TestOnly
    public Computation compute(ResultListener handler, String dsl, Principal principal, boolean shared) {
        ParsedSheet sheet = SheetReader.parseSheet(dsl);
        List<Viewport> viewports = new ArrayList<>();

        for (ParsedTable table : sheet.tables()) {
            for (ParsedFields fields : table.fields()) {
                for (ParsedField field : fields.fields()) {
                    Viewport viewport = new Viewport(new FieldKey(table.tableName(), field.fieldName()),
                            ComputationType.REQUIRED, 0, 1000, true, false);
                    viewports.add(viewport);
                }
            }

            List<ParsedTotal> totals = table.totals();
            for (int i = 0; i < totals.size(); i++) {
                ParsedTotal total = totals.get(i);
                for (ParsedFields field : total.fields()) {
                    Formula formula = field.formula();
                    if (formula != null) {
                        TotalKey key = new TotalKey(table.tableName(), field.fields().get(0).fieldName(), i + 1);
                        Viewport viewport = new Viewport(key, ComputationType.REQUIRED, 0, 1000, true, false);
                        viewports.add(viewport);
                    }
                }
            }
        }

        return compute(handler, List.of(sheet), viewports, null, principal, true, true, shared);
    }

    @TestOnly
    public Computation compute(ResultListener handler, String dsl, Principal principal, FieldKey... fields) {
        return compute(handler, dsl, principal, false, fields);
    }

    @TestOnly
    public Computation compute(ResultListener handler, String dsl, Principal principal, boolean shared, FieldKey... fields) {
        ParsedSheet parsedSheet = SheetReader.parseSheet(dsl);
        List<Viewport> viewports = Arrays.stream(fields).map(field -> new Viewport(field, ComputationType.REQUIRED, 0, 1000, true, false)).toList();
        return compute(handler, List.of(parsedSheet), viewports, null, principal, true, true, shared);
    }

    private Computation compute(Graph graph, ResultListener handler, long id, boolean profile) {
        Util.verify(!lock.isHeldByCurrentThread());
        lock.lock();

        try {
            Graph paused = executor.pause();

            merge(graph, paused);
            optimize(paused);

            Computation computation = new Computation(this, handler, id, profile);
            computations.put(computation.id(), computation);

            notifyRunning(computation, paused);
            updateComputations(paused, false);

            executor.resume(paused);
            return computation;
        } finally {
            lock.unlock();
        }
    }

    void cancel(Computation computation, Set<ParsedKey> keys) {
        Util.verify(!lock.isHeldByCurrentThread());
        lock.lock();

        try {
            long id = computation.id();
            if (computations.containsKey(id)) {
                Graph graph = executor.pause();
                cancel(computation, keys, graph);
                unlockUnused(graph);
                updateComputations(graph, true);
                executor.resume(graph);
            }
        } finally {
            lock.unlock();
        }
    }

    @Override
    public void onSchedule(Plan original, Plan replacement) {
        assert lock.isHeldByCurrentThread();

        if (!(original instanceof Running) && replacement instanceof Running running) {
            long startedAt = running.getStartedAt();

            for (Trace trace : original.getTraces()) {
                Computation computation = computations.get(trace.id());
                if (computation != null && computation.profile()) {
                    notify(() -> computation.onProfile(trace, startedAt, 0, false));
                }
            }
        }
    }

    @Override
    public void onCancel(Plan original) {
        assert lock.isHeldByCurrentThread();

        if (original instanceof Running running) {
            long startedAt = running.getStartedAt();
            long stoppedAt = System.currentTimeMillis();

            for (Trace trace : original.getTraces()) {
                Computation computation = computations.get(trace.id());
                if (computation != null && computation.profile()) {
                    notify(() -> computation.onProfile(trace, startedAt, stoppedAt, true));
                }
            }
        }
    }

    @Override
    public void onComplete(Plan original, Plan replacement) {
        assert lock.isHeldByCurrentThread();

        if (original instanceof Running && replacement instanceof Executed executed) {
            Plan plan = executed.getOriginal();
            Table table = (Table) executed.getResult();

            if (plan instanceof CacheLocal || plan instanceof StoreLocal) {
                for (Identity id : executed.getIdentities()) {
                    int[] columns = id.columns();
                    Table selected = table.select(columns);
                    cache.save(id, selected);
                }
            }
        }

        if (original instanceof Running running) {
            long startedAt = running.getStartedAt();
            long stoppedAt = (replacement instanceof Executed executed) ? executed.getStoppedAt() :
                    (replacement instanceof Failed failed) ? failed.getStoppedAt() : startedAt;

            for (Trace trace : original.getTraces()) {
                Computation computation = computations.get(trace.id());
                if (computation != null && computation.profile()) {
                    notify(() -> computation.onProfile(trace, startedAt, stoppedAt, true));
                }
            }
        }

        if (original instanceof Running running) {
            Plan plan = running.getOriginal();
            Table table = (replacement instanceof Executed executed) ? (Table) executed.getResult() : null;
            String error = (replacement instanceof Failed failed) ? extractError(failed.getError()) : null;

            if (plan instanceof RetrieverResultLocal result) {
                Computation computation = computations.get(result.getComputationId());
                notify(() -> computation.onSearchResult(result.getKey(), table, error));
            } else if (plan instanceof SimilaritySearchLocal result) {
                Computation computation = computations.get(result.getComputationId());
                notify(() -> computation.onSearchResult(result.getKey(), table, error));
            } else if (plan instanceof IndexResultLocal result) {
                Computation computation = computations.get(result.getComputationId());
                notify(() -> computation.onIndexResult(result.getKey(), table, error));
            } else if (plan instanceof ViewportLocal result) {
                Computation computation = computations.get(result.getComputationId());
                notify(() ->
                        computation.onViewportResult(result.getKey(), result.getResultType(),
                        result.getStart(), result.getEnd(),
                        result.isContent(), result.isRaw(),
                        table, error));
            }
        }
    }

    private void merge(Graph from, Graph to) {
        new Merge(from).apply(to);
        GraphPrinter.print(Level.DEBUG, "Merged graph", to);
    }

    private void optimize(Graph graph) {
        cache.begin();
        new Reuse(cache, store, toStore).apply(graph);
        new Reduce(true).apply(graph);
        new Deduplicate().apply(graph);
        new UniteAggregation().apply(graph);
        new Reduce(true).apply(graph);
        new UniteJoin().apply(graph);
        new Reduce(true).apply(graph);
        new Duplicate().apply(graph);
        new Carry(cache, store).apply(graph);
        new Carry(cache, store).apply(graph);  // doesn't carry at the first time ;(
        new Carry(cache, store).apply(graph);  // doesn't carry at the first time ;(
        new Reduce(false).apply(graph);
        new Deduplicate().apply(graph);
        new AssignStore(store, toStore).apply(graph);
        new AssignTrace().apply(graph);
        new Clean(true).apply(graph);
        cache.finish();
        unlockUnused(graph);

        graphCallback.onOptimized(graph);
        GraphPrinter.print(Level.DEBUG, "Optimized graph", graph);
    }

    private void cancel(Computation computation, Set<ParsedKey> keys, Graph graph) {
        new Cancel(computation.id(), keys).apply(graph);
        new Clean(true).apply(graph);
        GraphPrinter.print(Level.DEBUG, "Canceled graph", graph);
    }

    public void unlockUnused(Graph graph) {
        Set<Identity> unused = new HashSet<>(store.locks());
        graph.visitOut(node -> {
            if (node instanceof LoadLocal loadTable) {
                unused.removeAll(loadTable.getIdentities());
            }
        });

        unused.forEach(store::unlock);
    }

    private void updateComputations(Graph graph, boolean cancel) {
        Long2IntOpenHashMap counts =  new Long2IntOpenHashMap();

        for (Node node : graph.getNodes()) {
            if (NodeUtil.unwrapOriginal(node) instanceof ResultPlan result) {
                counts.addTo(result.getComputationId(), 1);
            }
        }

        LongList completed = new LongArrayList();

        for (Computation other : computations.values()) {
            int count = counts.getOrDefault(other.id(), 0);
            notify(() -> other.onUpdate(count, cancel));

            if (count == 0) {
                completed.add(other.id());
            }
        }

        for (long id : completed) {
            computations.remove(id);
        }
    }

    private void notifyRunning(Computation computation, Graph graph) {
        if (computation.profile()) {
            for (Node node : graph.getNodes()) {
                if (node instanceof Running running) {
                    long startedAt = running.getStartedAt();

                    for (Trace trace : node.getTraces()) {
                        if (trace.id() == computation.id()) {
                            notify(() -> computation.onProfile(trace, startedAt, 0, false));
                        }
                    }
                }
            }
        }
    }

    private void notify(Runnable task) {
        notifier.submit(() -> {
            try {
                task.run();
            } catch (Throwable e) {
                log.error("Failed to notify handler: ", e);
            }
        });
    }

    private static String extractError(Throwable error) {
        if (error == null) {
            return null;
        }

        String message = error.getMessage();
        return (message == null) ? "Failed to execute" : message;
    }
}
