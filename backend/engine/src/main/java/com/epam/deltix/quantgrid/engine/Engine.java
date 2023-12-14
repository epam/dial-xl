package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.engine.cache.Cache;
import com.epam.deltix.quantgrid.engine.cache.LocalCache;
import com.epam.deltix.quantgrid.engine.compiler.CompileContext;
import com.epam.deltix.quantgrid.engine.compiler.CompileError;
import com.epam.deltix.quantgrid.engine.compiler.CompileFormulaContext;
import com.epam.deltix.quantgrid.engine.compiler.CompilePivot;
import com.epam.deltix.quantgrid.engine.compiler.Compiler;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
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
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.SheetReader;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import it.unimi.dsi.fastutil.Pair;
import it.unimi.dsi.fastutil.longs.Long2ObjectMap;
import it.unimi.dsi.fastutil.longs.Long2ObjectOpenHashMap;
import lombok.Getter;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.TestOnly;

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

    private final Cache cache = new LocalCache();
    private final ExecutorService service;
    private final ResultListener listener;
    private final MetadataProvider provider;
    private Executor executor;
    private final GraphCallback graphCallback;

    @Getter
    private Map<FieldKey, String> compilationErrors = new HashMap<>();

    public Engine(ExecutorService service,
                  ResultListener listener,
                  GraphCallback graphCallback,
                  MetadataProvider provider) {
        this.service = service;
        this.listener = listener;
        this.graphCallback = graphCallback;
        this.provider = provider;
        this.executor = new Executor(service, listener, cache);
    }

    /**
     * @return list of fields and keys for the provided formula
     */
    public Pair<List<String>, List<String>> getFormulaSchema(Formula formula, String textFormula,
                                                             List<ParsedSheet> worksheets) {
        Compiler compiler = new Compiler(provider);
        compiler.setSheet(worksheets);

        CompileContext formulaContext = new CompileFormulaContext(compiler);
        CompiledResult result = formulaContext.compile(formula);

        if (result instanceof CompiledTable compiledTable) {
            List<String> fields = compiledTable.fields(formulaContext).stream()
                    .filter(field -> !field.equals(CompilePivot.PIVOT_NAME)).toList();
            List<String> keys = compiledTable.keys(formulaContext);
            return Pair.of(fields, keys);
        } else {
            throw new CompileError("Impossible to get dimensional schema for formula: " + textFormula);
        }
    }

    public CompletableFuture<Void> compute(List<ParsedSheet> worksheets, Collection<Viewport> viewports, long version) {
        Compiler compiler = new Compiler(provider);
        Graph graph = compiler.compile(worksheets, viewports);
        GraphPrinter.print("Compiled graph", graph);
        graphCallback.onCompiled(graph);
        compilationErrors = compiler.compileErrors();
        return compute(graph, version);
    }

    @TestOnly
    public CompletableFuture<Void> compute(String dsl, long version) {
        ParsedSheet parsedSheet = SheetReader.parseSheet(dsl);

        List<Viewport> viewports = new ArrayList<>();
        for (ParsedTable table : parsedSheet.getTables()) {
            for (ParsedField field : table.getFields()) {
                viewports.add(new Viewport(field.getKey(), 0, 1000, true));
            }
        }

        return compute(List.of(parsedSheet), viewports, version);
    }

    @TestOnly
    public CompletableFuture<Void> compute(String dsl, long version, FieldKey... fields) {
        ParsedSheet parsedSheet = SheetReader.parseSheet(dsl);
        List<Viewport> viewports = Arrays.stream(fields).map(field -> new Viewport(field, 0, 1000, true)).toList();
        return compute(List.of(parsedSheet), viewports, version);
    }

    private CompletableFuture<Void> compute(Graph graph, long version) {
        normalize(graph);
        graphCallback.onNormalized(graph);
        GraphPrinter.print("Normalized graph", graph);

        Graph previous = executor.cancel();
        optimize(previous, graph);
        graphCallback.onOptimized(graph);
        GraphPrinter.print("Optimized graph", graph);

        cancel(previous, graph);
        executor = new Executor(service, listener, cache);
        return executor.execute(graph, version);
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
}
