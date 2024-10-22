package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.compiler.Compiler;
import com.epam.deltix.quantgrid.engine.compiler.function.Function;
import com.epam.deltix.quantgrid.engine.executor.Executor;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.plan.Running;
import com.epam.deltix.quantgrid.engine.rule.AssignIdentity;
import com.epam.deltix.quantgrid.engine.rule.AssignStore;
import com.epam.deltix.quantgrid.engine.rule.Carry;
import com.epam.deltix.quantgrid.engine.rule.Clean;
import com.epam.deltix.quantgrid.engine.rule.ConstantFolding;
import com.epam.deltix.quantgrid.engine.rule.Deduplicate;
import com.epam.deltix.quantgrid.engine.rule.Duplicate;
import com.epam.deltix.quantgrid.engine.rule.EliminateProjection;
import com.epam.deltix.quantgrid.engine.rule.OptimizeFilter;
import com.epam.deltix.quantgrid.engine.rule.PushDownExpand;
import com.epam.deltix.quantgrid.engine.rule.Reduce;
import com.epam.deltix.quantgrid.engine.rule.ReuseCached;
import com.epam.deltix.quantgrid.engine.rule.ReusePrevious;
import com.epam.deltix.quantgrid.engine.rule.ReverseProjection;
import com.epam.deltix.quantgrid.engine.rule.UnitePivot;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ParsedTotal;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import it.unimi.dsi.fastutil.longs.Long2ObjectMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.TestOnly;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Arrays;
import java.util.Collection;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;

@Slf4j
public class Engine {

    private final Cache cache;
    private final ExecutorService service;
    private final ResultListener listener;
    private final InputProvider inputProvider;
    private Executor executor;
    private final GraphCallback graphCallback;

    @Getter
    private Map<ParsedKey, String> compilationErrors = new HashMap<>();

    public Engine(Cache cache,
                  ExecutorService service,
                  ResultListener listener,
                  GraphCallback graphCallback,
                  InputProvider inputProvider) {
        this.cache = cache;
        this.service = service;
        this.listener = listener;
        this.graphCallback = graphCallback;
        this.inputProvider = inputProvider;
        this.executor = new Executor(service, listener, cache);
    }

    public Engine withListener(ResultListener listener) {
        return new Engine(cache.copy(), service, listener, graphCallback, inputProvider);
    }

    public CompletableFuture<Void> compute(List<ParsedSheet> worksheets,
                                           Collection<Viewport> viewports,
                                           SimilarityRequest similarityRequest,
                                           Principal principal) {
        listener.onParsing(worksheets);
        Compiler compiler = new Compiler(inputProvider, principal);
        Graph graph = compiler.compile(worksheets, viewports, similarityRequest);
        compilationErrors = compiler.compileErrors();
        listener.onCompilation(compiler.compiled(), compilationErrors);
        GraphPrinter.print("Compiled graph", graph);
        graphCallback.onCompiled(graph);
        return compute(graph);
    }

    public List<SimilarityRequestField> getKeyStringFieldsWithDescriptions(
            List<ParsedSheet> worksheets, Principal principal) {
        return (new Compiler(inputProvider, principal)).getKeyStringFieldsWithDescriptions(worksheets);
    }

    @TestOnly
    public CompletableFuture<Void> compute(String dsl, Principal principal) {
        ParsedSheet sheet = SheetReader.parseSheet(dsl);
        List<Viewport> viewports = new ArrayList<>();

        for (ParsedTable table : sheet.tables()) {
            for (ParsedField field : table.fields()) {
                Viewport viewport = new Viewport(
                        new FieldKey(table.tableName(), field.fieldName()), 0, 1000, true);
                viewports.add(viewport);
            }

            ParsedTotal total = table.total();
            if (total != null) {
                for (FieldKey field : total.fields()) {
                    List<Formula> formulas = total.getTotals(field);
                    for (int i = 0; i < formulas.size(); i++) {
                        Formula formula = formulas.get(i);

                        if (formula != null) {
                            TotalKey key = new TotalKey(field.table(), field.fieldName(), i + 1);
                            Viewport viewport = new Viewport(key, 0, 1000, true);
                            viewports.add(viewport);
                        }
                    }
                }
            }
        }

        return compute(List.of(sheet), viewports, null, principal);
    }

    @TestOnly
    public CompletableFuture<Void> compute(String dsl, Principal principal, FieldKey... fields) {
        ParsedSheet parsedSheet = SheetReader.parseSheet(dsl);
        List<Viewport> viewports = Arrays.stream(fields).map(field -> new Viewport(field, 0, 1000, true)).toList();
        return compute(List.of(parsedSheet), viewports, null, principal);
    }

    private CompletableFuture<Void> compute(Graph graph) {
        normalize(graph);
        graphCallback.onNormalized(graph);
        GraphPrinter.print("Normalized graph", graph);

        Graph previous = executor.cancel();
        optimize(previous, graph);
        graphCallback.onOptimized(graph);
        GraphPrinter.print("Optimized graph", graph);

        cancel(previous, graph);
        executor = new Executor(service, listener, cache);
        return executor.execute(graph);
    }

    @TestOnly
    public ResultListener getListener() {
        return listener;
    }

    @TestOnly
    public Cache getCache() {
        return cache;
    }

    private void normalize(Graph graph) {
        new Clean(false).apply(graph);
        new Duplicate().apply(graph);
        new Reduce().apply(graph);
        new ReverseProjection().apply(graph);
        new PushDownExpand().apply(graph);
        new ConstantFolding().apply(graph);
        new EliminateProjection().apply(graph);
        new Deduplicate().apply(graph);
        new AssignIdentity().apply(graph);
    }

    private void optimize(Graph previous, Graph graph) {
        cache.begin();
        new ReuseCached(cache).apply(graph);
        new ReusePrevious(previous).apply(graph);
        new Deduplicate().apply(graph);
        new Duplicate().apply(graph);
        new Reduce().apply(graph);
        new Carry(cache).apply(graph);
        new Carry(cache).apply(graph);  // doesn't carry at the first time ;(
        new Reduce().apply(graph);
        new OptimizeFilter().apply(graph);
        new UnitePivot().apply(graph);
        new Deduplicate().apply(graph);
        new AssignStore().apply(graph);
        new Clean(true).apply(graph);
        cache.finish();
    }

    private void cancel(Graph previous, Graph graph) {
        Long2ObjectMap<Running> dead = new Long2ObjectOpenHashMap<>();

        for (Node node : previous.getNodes()) {
            if (node instanceof Running live) {
                dead.put(live.getOriginalId(), live);
            }
        }

        for (Node node : graph.getNodes()) {
            if (node instanceof Running live) {
                dead.remove(live.getOriginalId());
            }
        }

        for (Running plan : dead.values()) {
            plan.getTask().cancel(true);
        }
    }

    public void cancel() {
        for (Node node : executor.cancel().getNodes()) {
            if (node instanceof Running live) {
                live.getTask().cancel(true);
            }
        }
    }

    public List<Function> getPythonFunction(List<ParsedSheet> worksheets, Principal principal) {
        Compiler compiler = new Compiler(inputProvider, principal);
        compiler.setSheet(worksheets);
        return compiler.getPythonFunctionList();
    }
}
