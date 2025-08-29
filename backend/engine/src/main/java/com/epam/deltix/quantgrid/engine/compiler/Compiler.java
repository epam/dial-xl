package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.SimilarityRequest;
import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.Util;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.evaluation.EvaluationUtils;
import com.epam.deltix.quantgrid.engine.compiler.function.Argument;
import com.epam.deltix.quantgrid.engine.compiler.function.Function;
import com.epam.deltix.quantgrid.engine.compiler.function.FunctionType;
import com.epam.deltix.quantgrid.engine.compiler.function.Functions;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRow;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.FormatUtils;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleOrNestedValidators;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.graph.GraphPrinter;
import com.epam.deltix.quantgrid.engine.node.Node;
import com.epam.deltix.quantgrid.engine.node.Trace;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.IndexResultLocal;
import com.epam.deltix.quantgrid.engine.ComputationType;
import com.epam.deltix.quantgrid.engine.node.plan.local.SimilaritySearchLocal;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.rule.AssignIdentity;
import com.epam.deltix.quantgrid.engine.rule.AssignTrace;
import com.epam.deltix.quantgrid.engine.rule.Clean;
import com.epam.deltix.quantgrid.engine.rule.ConstantFolding;
import com.epam.deltix.quantgrid.engine.rule.Deduplicate;
import com.epam.deltix.quantgrid.engine.rule.EliminateProjection;
import com.epam.deltix.quantgrid.engine.rule.OptimizeAggregate;
import com.epam.deltix.quantgrid.engine.rule.OptimizeFilter;
import com.epam.deltix.quantgrid.engine.rule.PushDownExpand;
import com.epam.deltix.quantgrid.engine.rule.Reduce;
import com.epam.deltix.quantgrid.engine.rule.ReverseProjection;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedApply;
import com.epam.deltix.quantgrid.parser.ParsedDecorator;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedFields;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedPrimitive;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ParsedTotal;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.Span;
import com.epam.deltix.quantgrid.parser.TableKey;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.Nullable;
import org.slf4j.event.Level;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Accessors(fluent = true)
public class Compiler {
    static final String DIMENSIONAL_SCHEMA_REQUEST_TABLE_NAME = "_invalid_031574268";

    // FieldKey -> ParsedField
    // TableKey -> ParsedTable
    // TotalKey -> Formula
    private final Map<ParsedKey, Object> parsed = new LinkedHashMap<>();
    private final Map<String, CompileExplode> explodes = new HashMap<>();
    private final Map<String, CompileOverride> overrides = new HashMap<>();
    private final Map<CompileKey, CompiledResult> compiled = new HashMap<>();
    private final Set<CompileKey> compiling = new HashSet<>();

    private final Map<ParsedKey, CompileError> compileErrors = new HashMap<>();
    private final Map<String, ParsedPython.Function> pythonFunctions = new HashMap<>();
    private final Map<Formula, CompiledResult> formulas = new HashMap<>();

    @Getter
    private final Map<FieldKey, IndexResultLocal> indices = new HashMap<>();

    // reuse across explodes within a single compilation only (at least Executor and Carry rule modify Select)
    @Getter
    private final CompiledTable scalar = new CompiledNestedColumn(new Scalar(), CompiledTable.REF_NA, GeneralFormat.INSTANCE);

    @Getter
    private ParsedTable evaluationTable;

    @Getter
    private final InputProvider inputProvider;

    @Getter
    private final Principal principal;
    @Getter
    private final long computationId;
    @Getter
    private final ComputationType computationType;

    public Compiler(InputProvider inputProvider, Principal principal) {
       this(inputProvider, principal, 0, ComputationType.OPTIONAL);
    }

    public Compiler(InputProvider inputProvider, Principal principal, long computationId, ComputationType computationType) {
        this.inputProvider = inputProvider;
        this.principal = principal;
        this.computationId = computationId;
        this.computationType = computationType;
    }

    public Compilation compile(List<ParsedSheet> sheets,
                               Collection<Viewport> viewports,
                               boolean index,
                               @Nullable SimilarityRequest similarityRequest) {
        setSheet(sheets);
        Graph graph = new Graph();

        compileAll(viewports);
        compileViewports(graph, viewports);
        compileIndices(graph, index);
        compileSimilaritySearch(sheets, graph, similarityRequest);

        graph = normalizeGraph(graph);
        return buildCompilation(graph);
    }

    private void compileAll(Collection<Viewport> viewports) {
        Set<ParsedKey> keys = new HashSet<>(parsed.keySet());        // compile sheets fields
        keys.addAll(viewports.stream().map(Viewport::key).toList()); // compile viewports fields

        // can trigger appearing new dynamic fields
        for (ParsedKey key : keys) {
            try {
                compile(CompileKey.fromKey(key));
            } catch (CompileError ignored) {
            }
        }
    }

    private Graph normalizeGraph(Graph graph) {
        Graph copy = graph.copy(); // needs to be copied because compiled results will be broken
        GraphPrinter.print(Level.DEBUG, "Compiled graph", copy);

        new AssignTrace().apply(copy);
        new Clean(false).apply(copy);
        new Deduplicate().apply(copy);
        new Reduce(true).apply(copy);
        new ReverseProjection().apply(copy);
        new PushDownExpand().apply(copy);
        new ConstantFolding().apply(copy);
        new EliminateProjection().apply(copy);
        new OptimizeFilter().apply(copy);
        new Reduce(true).apply(copy);
        new OptimizeAggregate().apply(copy);
        new Deduplicate().apply(copy);
        new AssignIdentity().apply(copy);
        new AssignTrace().apply(copy);

        GraphPrinter.print(Level.DEBUG, "Normalized graph", copy);
        return copy;
    }

    private Compilation buildCompilation(Graph graph) {
        Map<ParsedKey, CompiledResult> results = new HashMap<>();
        Map<ParsedKey, String> hashes = new HashMap<>();
        Map<ParsedKey, CompileError> errors = new HashMap<>(compileErrors);
        Set<FieldKey> keys = new HashSet<>(indices.keySet());

        for (Map.Entry<CompileKey, CompiledResult> entry : compiled.entrySet()) {
            CompileKey key = entry.getKey();
            CompiledResult result = entry.getValue();

            if (!key.isTable() && key.exploded() && key.overridden()) {
                results.put(key.key(), result);
            }
        }

        for (Node node : graph.getNodes()) {
            if (node instanceof ViewportLocal viewport && viewport.getComputationType() != ComputationType.REQUIRED) {
                hashes.put(viewport.getKey(), viewport.getSource().semanticId());
            }
        }

        for (ParsedKey key : results.keySet()) {
            if (key instanceof FieldKey || key instanceof TotalKey) {
                Util.verify(hashes.containsKey(key));
            }
        }

        return new Compilation(results, keys, errors, hashes, graph);
    }

    private static ParsedTable getEvaluationTable(List<ParsedSheet> sheets) {
        for (ParsedSheet sheet : sheets) {
            for (ParsedTable table : sheet.tables()) {
                if (CompileEvaluationUtils.isEvaluationTable(table)) {
                    return table;
                }
            }
        }

        return null;
    }

    private void compileSimilaritySearch(List<ParsedSheet> sheets,
                                         Graph graph,
                                         @Nullable SimilarityRequest similarityRequest) {
        if (similarityRequest == null) {
            return;
        }

        CompileContext context = new CompileContext(this);
        CompiledResult result = context.compileFormula(new ConstText(similarityRequest.query()));

        Plan queryPlan = CompileEmbeddingIndex.compileEmbeddingIndex(
                context,
                context.scalarLayout().node(),
                result,
                null,
                similarityRequest.modelName(),
                EmbeddingType.QUERY);

        if (similarityRequest.useEvaluation()) {
            ParsedTable evaluationTable = getEvaluationTable(sheets);
            if (evaluationTable == null) {
                throw new CompileError("Evaluation table doesn't exist in the project");
            }
            List<CompileEvaluationUtils.EvaluationField> evaluationFields =
                    CompileEvaluationUtils.getEvaluationFields(evaluationTable);
            for (CompileEvaluationUtils.EvaluationField evaluationField : evaluationFields) {
                graph.add(CompileSimilaritySearch.compileSimilaritySearch(
                        this, evaluationField.field(), similarityRequest.query(), evaluationField.span()));
            }
        } else if (similarityRequest.searchInAll()) {
            indices.forEach((key, data) -> {
                SimilaritySearchLocal plan =
                        new SimilaritySearchLocal(data.getSource(), queryPlan, key, similarityRequest.n(), computationId);
                plan.getTraces().addAll(data.getTraces());
                graph.add(plan);
            });
        } else {
            for (SimilarityRequestField field : similarityRequest.fields()) {
                IndexResultLocal data = indices.get(field.key());
                if (data == null) {
                    throw new IllegalArgumentException("Column %s does not have index.".formatted(field.key()));
                }

                SimilaritySearchLocal plan = new SimilaritySearchLocal(data.getSource(), queryPlan,
                        field.key(), field.n(), computationId);
                plan.getTraces().addAll(data.getTraces());
                graph.add(plan);
            }
        }
    }

    public void compileViewports(Graph graph, Collection<Viewport> viewports) {
        Map<ParsedKey, Set<Viewport>> map = new HashMap<>();

        for (Viewport viewport : viewports) {
            Set<Viewport> all = map.computeIfAbsent(viewport.key(), t -> new HashSet<>());
            all.add(viewport);
        }

        for (ParsedKey key : parsed.keySet()) {
            if ((key instanceof FieldKey || key instanceof TotalKey)) {
                Set<Viewport> all = map.computeIfAbsent(key, t -> new HashSet<>());
                Viewport anchor = new Viewport(key, computationType, 0, 0, false, false);
                all.add(anchor);
            }
        }

        for (ParsedKey key : map.keySet()) {
            CompileKey compileKey = CompileKey.fromKey(key);
            try {
                CompiledResult result = compile(compileKey);
                Set<Viewport> all = map.get(key);
                List<ViewportLocal> plans = compileViewports(compileKey, result, all);
                plans.forEach(graph::add);
            } catch (CompileError e) {
                // TODO: Propagate errors related to unknown fields in viewports
                // all errors already stored during compile() method
                // but in some cases (like duplicated tables) they may absent
                // since we don't have a proper solution - they are ignored for now
                // Util.verify(compileErrors.containsKey(key.toFieldKey()));
                compileErrors.putIfAbsent(compileKey.key(), e);
            }
        }
    }

    public void compileIndices(Graph graph, boolean index) {
        for (ParsedKey key : parsed.keySet()) {
            CompileKey compileKey = CompileKey.fromKey(key);
            try {
                IndexResultLocal plan = compileIndex(compileKey, index ? ComputationType.REQUIRED : computationType);
                if (plan != null) {
                    graph.add(plan);
                }
            } catch (CompileError e) {
                compileErrors.putIfAbsent(compileKey.key(), e);
            }
        }
    }

    private IndexResultLocal compileIndex(CompileKey compileKey, ComputationType type) {
        if (!compileKey.isField()) {
            return null;
        }
        FieldKey fieldKey = compileKey.fieldKey();
        IndexResultLocal plan = indices.get(fieldKey);
        if (plan != null) {
            Util.verify(plan.getComputationType() != type);
            return plan;
        }

        CompiledResult result = compile(compileKey);
        ParsedField field = getParsedField(fieldKey);
        ParsedDecorator indexDecorator = findDecorator(field, CompileEvaluationUtils.INDEX_DECORATOR);
        Span span;
        if (indexDecorator != null) {
            span = indexDecorator.span();
        } else if (field.isKey() && result instanceof CompiledColumn column && column.type().isString()) {
            span = field.key().span();
        } else {
            return null;
        }

        CompileContext context = new CompileContext(this, compileKey);
        Plan embedding = CompileSimilaritySearch.compileIndex(
                context, fieldKey, findDecorator(field, CompileEvaluationUtils.DESCRIPTION_DECORATOR));
        plan = new IndexResultLocal(embedding, fieldKey, computationId, type);

        Trace trace = new Trace(context.computationId(), Trace.Type.INDEX, fieldKey, span);
        plan.getTraces().add(trace);

        this.indices.put(compileKey.fieldKey(), plan);
        return plan;
    }

    private ParsedField getParsedField(FieldKey fieldKey) {
        ParsedFields fields = (ParsedFields) parsed.get(fieldKey);

        for (ParsedField candidate : fields.fields()) {
            if (candidate.fieldName().equals(fieldKey.fieldName())) {
                return candidate;
            }
        }

        throw new CompileError("Missing field: %s".formatted(fieldKey));
    }

    public void setSheet(Collection<ParsedSheet> sheets) {
        List<ParsedTable> tables = new ArrayList<>();
        List<ParsingError> errors = new ArrayList<>();

        for (ParsedSheet sheet : sheets) {
            tables.addAll(sheet.tables());
            errors.addAll(sheet.errors());
        }

        for (ParsingError error : errors) {
            log.warn("Parsing error: {}", error);
        }

        for (ParsedTable table : tables) {
            String tableName = table.tableName();
            TableKey tableKey = new TableKey(tableName);

            if (table.overrides() != null) {
                CompileContext context = new CompileContext(this, CompileKey.tableKey(tableName));
                overrides.put(table.tableName(), new CompileOverride(context, table));
            }

            for (ParsedFields declaration : table.fields()) {
                for (ParsedField field : declaration.fields()) {
                    FieldKey fieldKey = new FieldKey(tableName, field.fieldName());
                    parsed.put(fieldKey, declaration);
                }
            }

            List<ParsedTotal> totals = table.totals();
            for (int i = 0; i < totals.size(); i++) {
                ParsedTotal total = totals.get(i);
                for (ParsedFields field : total.fields()) {
                    Formula formula = field.formula();
                    if (formula != null) {
                        TotalKey totalKey = new TotalKey(tableName, field.fields().get(0).fieldName(), i + 1);
                        parsed.put(totalKey, formula);
                    }
                }
            }

            parsed.put(tableKey, table);
        }

        for (ParsedSheet sheet : sheets) {
            for (ParsedPython python : sheet.pythons()) {
                for (ParsedPython.Function function : python.functions()) {
                    pythonFunctions.put(function.name().toUpperCase(), function);
                }
            }
        }

        evaluationTable = EvaluationUtils.getAndValidateEvaluationTable(compileErrors, parsed, tables);
    }

    CompiledResult compile(CompileKey key) {
        CompiledResult result = compiled.get(key);
        if (result != null) {
            return result;
        }

        CompileError error = compileErrors.get(key.key());
        if (error != null) {
            throw error;
        }

        if (!key.isOverride()) {
            CompileUtil.verify(parsedObject(key) != null);
        }

        if (!compiling.add(key)) {
            throw new CompileError("Cyclic dependency: " + key.key());
        }

        try {
            if (key.isTable()) {
                result = compileExplode(key);
            } else if (key.isField()) {
                result = compileField(key);
            } else if (key.isTotal()) {
                result = compileTotal(key);
            } else if (key.isOverride()) {
                result = compileOverride(key);
            } else {
                throw new IllegalArgumentException("Unsupported key: " + key);
            }

            compiled.put(key, result);
        } catch (Throwable exception) {
            if (exception instanceof CompileError e) {
                log.info("Compile error: {}. Error: {}", key, exception.getMessage());
                error = e;
            } else {
                log.warn("Compile error: {}. Error: ", key, exception);
                error = new CompileError(exception);
            }

            compileErrors.put(key.key(), error);
        }

        compiling.remove(key);

        if (error != null) {
            throw error;
        }

        return result;
    }

    private CompiledTable compileExplode(CompileKey key) {
        ParsedTable table = parsedObject(key);
        boolean manual = CompileManual.isManual(table);
        ParsedApply apply = table.apply();

        List<FieldKey> dims = table.fields()
                .stream()
                .filter(ParsedFields::isDim)
                .map(fields -> fields.fields().get(0))
                .map(field -> new FieldKey(table.tableName(), field.fieldName()))
                .toList();

        List<FieldKey> allDims = new ArrayList<>(dims);

        if (manual) {
            allDims.add(CompileManual.dimension(table));
        }

        if (apply != null) {
            allDims.add(CompileApply.dimension(table));
        }

        CompileExplode explode = new CompileExplode(allDims, scalar);
        explodes.put(key.table(), explode);

        if (manual) {
            CompileContext context = new CompileContext(this, key);
            CompiledTable result = CompileManual.compile(context, table, dims);
            explode.add(result, allDims.get(0));
        } else {
            for (FieldKey dimension : dims) {
                compile(new CompileKey(dimension, false, false));
            }
        }

        if (apply != null) {
            int position = allDims.size() - 1;
            CompileContext context = new CompileContext(this, key);
            CompiledResult result = CompileApply.compile(apply, context, allDims.subList(0, position));
            explode.add(result, allDims.get(position));
        }

        return explode.layout();
    }

    private CompiledResult compileField(CompileKey key) {
        FieldKey fieldKey = key.fieldKey();
        CompiledResult result;

        if (key.exploded()) {
            result = compileExplodedField(fieldKey, key.overridden());
        } else if (key.overridden()) {
            result = compileOverriddenField(fieldKey);
        } else {
            result = compileUnexplodedField(fieldKey);
        }

        ParsedFields fields = (ParsedFields) parsed.get(fieldKey);
        Span span = fields.formula().span();

        if (span == null) {
            span = fields.span();
        }

        if (span != null) { // for dynamic fields
            Trace trace = new Trace(computationId, Trace.Type.COMPUTE, fieldKey, span);
            result.node().getTraces().add(trace);
        }

        return result;
    }

    private CompiledResult compileExplodedField(FieldKey fieldKey, boolean overridden) {
        String tableName = fieldKey.tableName();
        compile(CompileKey.tableKey(tableName));

        CompileExplode explode = explodes.get(tableName);
        CompiledResult result = compile(CompileKey.fieldKey(fieldKey, false, overridden));
        return explode.promote(result, explode.dimensions());
    }

    private CompiledResult compileOverriddenField(FieldKey fieldKey) {
        String table = fieldKey.tableName();
        CompiledResult result = compile(new CompileKey(fieldKey, false, false));
        CompileOverride override = overrides.get(table);

        if (override != null) {
            CompileContext context = new CompileContext(this, new CompileKey(fieldKey, false, true));
            result = override.compileField(context, result);
        }

        return format(result, fieldKey);
    }

    private CompiledResult compileUnexplodedField(FieldKey fieldKey) {
        CompileExplode explode = explodes.get(fieldKey.tableName());
        ParsedFields fields = (ParsedFields) parsed.get(fieldKey);

        try {
            CompileContext context = new CompileContext(this, new CompileKey(fieldKey, false, false));
            CompiledResult result = compileFormula(context, fields.formula());

            if (fields.isDim()) {
                ParsedField first = fields.fields().get(0);
                FieldKey dimension = new FieldKey(fieldKey.table(), first.fieldName());
                result = explode.add(result, dimension).flat();
            }

            return assignUnexplodedField(context, fieldKey, fields, result);
        } catch (Throwable exception) {
            CompileError error = exception instanceof CompileError e ? e : new CompileError(exception);

            for (ParsedField field : fields.fields()) {
                compiled.remove(CompileKey.fieldKey(fieldKey.table(), field.fieldName(), false, false));
                compileErrors.put(new FieldKey(fieldKey.table(), field.fieldName()), error);
            }

            throw exception;
        }
    }

    private CompiledResult assignUnexplodedField(CompileContext context, FieldKey key,
                                                 ParsedFields fields, CompiledResult result) {
        List<ParsedField> declaredFields = fields.fields();

        if (declaredFields.size() == 1 && (result instanceof CompiledColumn || result instanceof CompiledPivotColumn)) {
            return result;
        }

        if (!result.assignable()) {
            CompiledTable resultTable = result.cast(CompiledTable.class);
            List<String> resultFields = resultTable.fields(context);
            throw new CompileError("Unable to assign result. Change formula to access one or more columns: "
                    + String.join(", ", resultFields));
        }

        if (declaredFields.size() > 1 || !result.reference()) {
            if (result.reference()) {
                throw new CompileError("Declared " + declaredFields.size()
                        + " columns, but formula produces table reference");
            }

            if (result instanceof CompiledColumn) {
                throw new CompileError("Declared " + declaredFields.size()
                        + " columns, but formula produces 1 column");
            }

            CompiledTable resultTable = result.cast(CompiledTable.class);
            List<String> resultFields = resultTable.fields(context);

            if (resultFields.size() != declaredFields.size()) {
                throw new CompileError("Declared " + declaredFields.size() + " columns, but formula produces "
                        + resultFields.size() + ": " + String.join(", ", resultFields));
            }

            for (int i = 0; i < declaredFields.size(); i++) {
                ParsedField field = declaredFields.get(i);
                CompiledResult fieldResult = resultTable.field(context, resultFields.get(i));
                CompileKey fieldKey = CompileKey.fieldKey(key.table(), field.fieldName(), false, false);
                compiled.put(fieldKey, fieldResult);

                if (key.fieldName().equals(field.fieldName())) {
                    result = fieldResult;
                }
            }
        }

        return result;
    }

    /**
     * Applies a format decorator if specified on a numeric column.
     * @param result The compiled result.
     * @param fieldKey The column key.
     * @return A column with an assigned format, or the unchanged {@code result} if no format is specified.
     */
    public CompiledResult format(CompiledResult result, FieldKey fieldKey) {
        ParsedField field = getParsedField(fieldKey);
        ParsedDecorator decorator = findDecorator(field, "format");
        if (decorator == null) {
            return result;
        }

        if (!(result instanceof CompiledColumn column)) {
            throw new CompileError("Cannot apply format to %s."
                    .formatted(CompileUtil.getResultTypeDisplayName(result)));
        }

        List<Object> params = decorator.params().stream()
                .map(ParsedPrimitive::value)
                .toList();
        if (params.isEmpty()) {
            throw new CompileError("Missing format parameters");
        }
        if (!(params.get(0) instanceof String formatName)) {
            throw new CompileError("Format name must be a text");
        }

        if ("text".equals(formatName)) {
            CompileUtil.verify(params.size() == 1, "Text formatting doesn't have arguments");
            return CompileUtil.toStringColumn(column);
        }

        ColumnFormat format = FormatUtils.createFormat(formatName, params.stream().skip(1).toList());
        if (format != GeneralFormat.INSTANCE) {
            column = SimpleOrNestedValidators.forType(ColumnType.DOUBLE).convert(column);
        }
        return column.transform(node -> node, format);
    }

    @Nullable
    private ParsedDecorator findDecorator(ParsedField field, String decoratorName) {
        List<ParsedDecorator> decorators = field.decorators().stream()
                .filter(decorator -> decoratorName.equals(decorator.decoratorName()))
                .limit(2)
                .toList();
        if (decorators.isEmpty()) {
            return null;
        }

        if (decorators.size() > 1) {
            throw new CompileError("Only a single %s decorator is allowed on a field".formatted(decoratorName));
        }

        return decorators.get(0);
    }

    @Nullable
    private CompiledSimpleColumn compileOverride(CompileKey key) {
        CompileOverride override = overrides.get(key.table());

        if (override != null) {
            CompileContext context = new CompileContext(this, key);
            return override.compileOverride(context);
        }

        return null;
    }

    int findOverridePosition(String table, String field, CompiledRow rowKeys) {
        CompileOverride override = overrides.get(table);

        if (override != null) {
            FieldKey fieldKey = new FieldKey(table, field);
            return override.findOverridePosition(fieldKey, rowKeys);
        }

        return -1;
    }

    @Nullable
    CompiledRow findOverrideRowKeys(String table, int position) {
        CompileOverride override = overrides.get(table);
        return (override == null) ? null : override.findOverrideRowKeys(position);
    }

    boolean canMatchOverride(String table) {
        CompileOverride override = overrides.get(table);
        return (override != null) && override.canMatchOverride();
    }

    private CompiledResult compileTotal(CompileKey key) {
        CompileContext context = new CompileContext(this, key);
        Formula formula = parsedObject(key);
        return CompileTotal.compile(context, formula);
    }

    private List<ViewportLocal> compileViewports(CompileKey key, CompiledResult exploded, Set<Viewport> viewports) {
        CompiledResult unexploded = key.isField()
                ? compile(CompileKey.fieldKey(key.fieldKey(), false, true))
                : exploded;

        CompileContext context = new CompileContext(this, key);
        List<ViewportLocal> plans = new ArrayList<>();
        ResultType type = ResultType.toResultType(exploded);

        for (Viewport viewport : viewports) {
            ViewportLocal plan = CompileViewport.compileViewport(context, type, unexploded, exploded.dimensions(), viewport);
            plans.add(plan);
        }

        return plans;
    }

    CompiledResult compileFormula(CompileContext context, Formula formula) {
        CompiledResult result = CompileFormula.compile(context, formula);
        formulas.put(formula, result);
        ParsedKey key = context.key().key();
        Span span = formula.span();

        if (span != null && result.node().getTraces().isEmpty()) {
            Trace trace = new Trace(computationId, Trace.Type.COMPUTE, key, span);
            result.node().getTraces().add(trace);
        }

        return result;
    }

    CompiledTable layoutTable(String table, List<FieldKey> dimensions) {
        if (dimensions.isEmpty()) {
            return scalar;
        }

        CompileExplode explode = explodes.get(table);
        return explode.layout(dimensions);
    }

    CompiledResult promoteResult(CompileContext context, CompiledResult result, List<FieldKey> dimensions) {
        if (dimensions.isEmpty()) {
            return result;
        }

        CompileExplode explode = explodes.get(context.key().table());
        CompiledResult promoted = explode.promote(result, dimensions);
        promoted.node().getTraces().addAll(result.node().getTraces());
        return promoted;
    }

    List<FieldKey> combineDimensions(CompileContext context, List<FieldKey> left, List<FieldKey> right) {
        if (left.equals(right)) {
            return left;
        }

        CompileExplode explode = explodes.get(context.key().table());
        return explode.combine(left, right);
    }

    @SuppressWarnings("unchecked")
    <T> T parsedObject(CompileKey key) {
        Object object = parsed.get(key.key());

        if (object == null && key.isTable()) {
            throw new CompileError("Unknown table: " + key.table());
        }

        if (object == null && key.isTotal()) {
            TotalKey totalKey = key.totalKey();
            throw new CompileError("Unknown total. Table: " + totalKey.table()
                    + ". Column: " + totalKey.field() + ". Number: " + totalKey.number());
        }

        if (object == null && key.isField()) {
            ParsedFields fields = (ParsedFields) parsed.get(CompilePivot.pivotKey(key.table()));
            CompileUtil.verify(fields != null, "The column '%s' does not exist in the table '%s'.",
                    key.fieldKey().fieldName(), key.table());

            object = CompilePivot.pivotParsedField(key.fieldKey());
            parsed.put(key.fieldKey(), object);
        }

        return (T) object;
    }

    boolean hasParsedObject(CompileKey key) {
        return parsed.containsKey(key.key());
    }

    @Nullable
    Function getFunctionSpecSafe(String name) {
        Function function = Functions.getFunction(name);
        ParsedPython.Function python = pythonFunctions.get(name);

        if (function == null && python == null) {
            return null;
        }

        if (function != null && python != null) {
            throw new CompileError("Python function has same name as function: " + name);
        }

        if (function != null) {
            return function;
        }

        List<Argument> args = python.parameters().stream()
                .map(parameter -> new Argument(parameter.name(), python.name(), false))
                .toList();

        return new Function(name, "python function", List.of(FunctionType.PYTHON), args);
    }

    Function getFunctionSpec(String name) {
        Function function = getFunctionSpecSafe(name);
        if (function == null) {
            throw new CompileError("Unknown function: " + name);
        }
        return function;
    }

    ParsedPython.Function getPythonFunction(String name) {
        return pythonFunctions.get(name);
    }

    public List<Function> getPythonFunctionList() {
        return pythonFunctions.keySet().stream().map(this::getFunctionSpec).toList();
    }

    CompiledResult lookupResult(Formula formula) {
        return formulas.get(formula);
    }
}
