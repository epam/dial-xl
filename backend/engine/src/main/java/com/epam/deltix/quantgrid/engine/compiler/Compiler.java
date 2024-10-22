package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.SimilarityRequest;
import com.epam.deltix.quantgrid.engine.SimilarityRequestField;
import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.evaluation.EvaluationUtils;
import com.epam.deltix.quantgrid.engine.compiler.function.Argument;
import com.epam.deltix.quantgrid.engine.compiler.function.Function;
import com.epam.deltix.quantgrid.engine.compiler.function.FunctionType;
import com.epam.deltix.quantgrid.engine.compiler.function.Functions;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRow;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.embeddings.EmbeddingType;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.plan.Plan;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.service.input.storage.InputProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedApply;
import com.epam.deltix.quantgrid.parser.ParsedDecorator;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.ParsedPython;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ParsedTotal;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.TableKey;
import com.epam.deltix.quantgrid.parser.TotalKey;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.Nullable;

import java.security.Principal;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Accessors(fluent = true)
@RequiredArgsConstructor
public class Compiler {

    private static final String DEFAULT_COMPILATION_ERROR = "Failed to compile field ";
    static final String DIMENSIONAL_SCHEMA_REQUEST_TABLE_NAME = "_invalid_031574268";

    // FieldKey -> ParsedField
    // TableKey -> ParsedTable
    // TotalKey -> Formula
    private final Map<ParsedKey, Object> parsed = new LinkedHashMap<>();
    private final Map<String, CompileExplode> explodes = new HashMap<>();
    private final Map<String, CompileOverride> overrides = new HashMap<>();
    @Getter
    private final Map<CompileKey, CompiledResult> compiled = new HashMap<>();
    private final Set<CompileKey> compiling = new HashSet<>();
    // table, viewports
    private final Map<ParsedKey, Set<Viewport>> viewports = new LinkedHashMap<>();

    private final Map<ParsedKey, CompileError> compileErrors = new HashMap<>();
    private final Map<String, ParsedPython.Function> pythonFunctions = new HashMap<>();

    // reuse across explodes within a single compilation only (at least Executor and Carry rule modify Select)
    @Getter
    private final CompiledTable scalar = new CompiledNestedColumn(new Scalar(), CompiledTable.REF_NA);

    @Getter
    private ParsedTable evaluationTable;

    @Getter
    private final InputProvider inputProvider;

    @Getter
    private final Principal principal;

    public Graph compile(List<ParsedSheet> sheets,
                         Collection<Viewport> viewports,
                         @Nullable SimilarityRequest similarityRequest) {
        setSheet(sheets);

        Graph graph = new Graph();

        compileViewPortNodes(graph, viewports);
        compileSimilarityNodes(sheets, graph, similarityRequest);

        return graph;
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

    private void compileSimilarityNodes(List<ParsedSheet> sheets,
                                        Graph graph,
                                        @Nullable SimilarityRequest similarityRequest) {
        if (similarityRequest == null) {
            return;
        }

        CompileFormulaContext context = new CompileFormulaContext(this);
        CompiledResult result = context.compileFormula(new ConstText(similarityRequest.query()));

        Plan queryPlan = CompileEmbeddingIndex.compileEmbeddingIndex(
                context,
                context.scalarLayout().node(),
                result,
                null,
                similarityRequest.modelName(),
                EmbeddingType.QUERY);

        ParsedTable evaluationTable = null;
        if (similarityRequest.useEvaluation()) {
            evaluationTable = getEvaluationTable(sheets);

            if (evaluationTable == null) {
                throw new CompileError("Evaluation table doesn't exist in the project");
            }
        }

        for (SimilarityRequestField field : similarityRequest.fields()) {
            try {
                if (evaluationTable != null) {
                    graph.add(CompileSimilaritySearch.compileSimilaritySearch(this, field, similarityRequest.query(), evaluationTable));
                } else {
                    graph.add(CompileSimilaritySearch.compileSimilaritySearch(this, field, similarityRequest.modelName(), queryPlan));
                }
            } catch (Exception e) {
                // all errors already stored during compile() method
                // but in some cases (like duplicated tables) they may absent
                // since we don't have a proper solution - they are ignored for now
                // Util.verify(compileErrors.containsKey(key.toFieldKey()));
            }
        }
    }

    public void compileViewPortNodes(Graph graph,
                                     Collection<Viewport> viewports) {
        setViewports(viewports);

        for (ParsedKey viewportKey : this.viewports.keySet()) {
            CompileKey compileKey = CompileKey.fromKey(viewportKey);

            try {
                CompiledResult explodedResult = compile(compileKey);
                List<ViewportLocal> viewPortNodes = compileViewports(compileKey, explodedResult);
                viewPortNodes.forEach(graph::add);
            } catch (Exception e) {
                // TODO: Propagate errors related to unknown fields in viewports
                // all errors already stored during compile() method
                // but in some cases (like duplicated tables) they may absent
                // since we don't have a proper solution - they are ignored for now
                // Util.verify(compileErrors.containsKey(key.toFieldKey()));
            }
        }
    }

    public List<SimilarityRequestField> getKeyStringFieldsWithDescriptions(List<ParsedSheet> sheets) {
        setSheet(sheets);

        List<SimilarityRequestField> fields = new ArrayList<>();
        for (ParsedSheet sheet : sheets) {
            for (ParsedTable table : sheet.tables()) {
                for (ParsedField field : table.fields()) {
                    if (!field.isKey()) {
                        continue;
                    }

                    FieldKey key = new FieldKey(table.tableName(), field.fieldName());

                    CompiledColumn result;
                    try {
                        result = compileField(new CompileKey(key, true, true)).cast(CompiledColumn.class);
                    } catch (CompileError e) {
                        continue;
                    }

                    if (result.type() != ColumnType.STRING) {
                        continue;
                    }

                    FieldKey descriptionField = null;
                    for (ParsedDecorator decorator : field.decorators()) {
                        if (decorator.decoratorName().equals(CompileEvaluationUtils.DESCRIPTION_DECORATOR)) {
                            descriptionField = new FieldKey(table.tableName(), (String) decorator.params().get(0).value());

                            break;
                        }
                    }

                    fields.add(new SimilarityRequestField(key, descriptionField, -1));
                }
            }
        }

        return fields;
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

        Set<ParsedKey> duplicates = getDuplicatedFieldKeys(tables);
        for (ParsedTable table : tables) {
            String tableName = table.tableName();
            TableKey tableKey = new TableKey(tableName);
            if (duplicates.contains(tableKey)) {
                compileErrors.put(tableKey,
                        new CompileError(
                                "Table names must be unique across the project, duplicated name: " + tableName));
                continue;
            }

            if (table.overrides() != null) {
                CompileContext context = new CompileContext(this, CompileKey.tableKey(tableName));
                overrides.put(table.tableName(), new CompileOverride(context, table));
            }

            List<ParsedField> uniqueFields = new ArrayList<>();
            for (ParsedField field : table.fields()) {
                FieldKey fieldKey = new FieldKey(tableName, field.fieldName());
                if (duplicates.contains(fieldKey)) {
                    compileErrors.put(fieldKey,
                            new CompileError("Table %s contains duplicated field %s".formatted(tableName,
                                    fieldKey.fieldName())));
                } else {
                    parsed.put(fieldKey, field);
                    uniqueFields.add(field);
                }
            }

            ParsedTotal total = table.total();
            if (total != null) {
                for (FieldKey field : total.fields()) {
                    List<Formula> formulas = total.getTotals(field);

                    for (int i = 0; i < formulas.size(); i++) {
                        Formula formula = formulas.get(i);
                        if (formula != null) {
                            TotalKey totalKey = new TotalKey(field.table(), field.fieldName(), i + 1);
                            parsed.put(totalKey, formula);
                        }
                    }
                }
            }

            parsed.put(tableKey, ParsedTable.builder()
                    .span(table.span())
                    .fields(uniqueFields)
                    .name(table.name())
                    .apply(table.apply())
                    .total(table.total())
                    .overrides(table.overrides())
                    .decorators(table.decorators())
                    .docs(table.docs())
                    .build());
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

    public Map<ParsedKey, String> compileErrors() {
        Map<ParsedKey, String> result = new HashMap<>();
        for (Map.Entry<ParsedKey, CompileError> entry : compileErrors.entrySet()) {
            ParsedKey key = entry.getKey();
            CompileError exception = entry.getValue();
            String errorMessage = exception.getMessage() == null
                    ? defaultErrorMessage(key) : exception.getMessage();
            result.put(key, errorMessage);
        }
        return result;
    }

    private static String defaultErrorMessage(ParsedKey key) {
        return DEFAULT_COMPILATION_ERROR + key;
    }

    private Set<ParsedKey> getDuplicatedFieldKeys(List<ParsedTable> tables) {
        Map<String, List<ParsedTable>> groupedTables = tables.stream()
                .collect(Collectors.groupingBy(ParsedTable::tableName, Collectors.toList()));

        Set<ParsedKey> duplicates = new HashSet<>();
        for (Map.Entry<String, List<ParsedTable>> tableEntry : groupedTables.entrySet()) {
            String tableName = tableEntry.getKey();
            List<ParsedTable> tableGroup = tableEntry.getValue();
            if (tableGroup.size() > 1) {
                duplicates.add(new TableKey(tableName));
                continue;
            }

            ParsedTable table = tableGroup.get(0);
            Map<String, List<ParsedField>> groupedFields = table.fields().stream()
                    .collect(Collectors.groupingBy(ParsedField::fieldName, Collectors.toList()));

            for (Map.Entry<String, List<ParsedField>> fieldEntry : groupedFields.entrySet()) {
                String fieldName = fieldEntry.getKey();
                List<ParsedField> fieldGroup = fieldEntry.getValue();

                if (fieldGroup.size() > 1) {
                    duplicates.add(new FieldKey(tableName, fieldName));
                }
            }
        }

        return duplicates;
    }

    private void setViewports(Collection<Viewport> newViewports) {
        viewports.clear();

        for (Viewport viewport : newViewports) {
            Set<Viewport> ranges = viewports.computeIfAbsent(viewport.key(), t -> new HashSet<>());
            ranges.add(viewport);
        }

        for (ParsedKey key : parsed.keySet()) {
            if ((key instanceof FieldKey || key instanceof TotalKey) && !viewports.containsKey(key)) {
                viewports.put(key, Set.of(new Viewport(key, -1, -1, false)));
            }
        }
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
            log.warn("Compile error: {}. Error: ", key, exception);
            error = exception instanceof CompileError e ? e : new CompileError(exception);
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
                .filter(ParsedField::isDim)
                .map(f -> new FieldKey(table.tableName(), f.fieldName()))
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
            CompiledTable result = CompileManual.compile(table, scalar, dims);
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
        if (key.exploded()) {
            return compileExplodedField(fieldKey, key.overridden());
        } else if (key.overridden()) {
            return compileOverriddenField(fieldKey);
        } else {
            return compileUnexplodedField(fieldKey);
        }
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
            return override.compileField(context, result);
        }

        return result;
    }

    private CompiledResult compileUnexplodedField(FieldKey fieldKey) {
        CompileExplode explode = explodes.get(fieldKey.tableName());
        ParsedField field = (ParsedField) parsed.get(fieldKey);

        CompileContext context = new CompileContext(this, new CompileKey(fieldKey, false, false));
        CompiledResult result = compileFormula(context, field.formula().formula());

        if (field.isDim()) {
            result = explode.add(result, fieldKey).flat();
        }

        return result;
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

    private List<ViewportLocal> compileViewports(CompileKey key, CompiledResult explodedResult) {
        CompiledResult unexplodedResult = key.isField()
                ? compile(CompileKey.fieldKey(key.fieldKey(), false, true))
                : explodedResult;

        CompileContext context = new CompileContext(this, key);
        List<ViewportLocal> viewportPlans = new ArrayList<>();
        ResultType resultType = ResultType.toResultType(explodedResult);

        for (Viewport viewport : viewports.getOrDefault(key.key(), Set.of())) {
            ViewportLocal viewportPlan = CompileViewport.compileViewport(
                    context,
                    resultType,
                    unexplodedResult,
                    explodedResult.dimensions(),
                    viewport);

            viewportPlans.add(viewportPlan);
        }

        if (unexplodedResult instanceof CompiledPivotTable pivot) { // just to cache, should be revisited
            List<ViewportLocal> views = CompileViewport.compilePivotViewports(key.fieldKey(), pivot);
            viewportPlans.addAll(views);
        }

        return viewportPlans;
    }

    CompiledResult compileFormula(CompileContext context, Formula formula) {
        return CompileFormula.compile(context, formula);
    }

    CompiledTable layoutTable(String table, List<FieldKey> dimensions) {
        CompileExplode explode = explodes.get(table);
        return explode.layout(dimensions);
    }

    CompiledResult promoteResult(CompileContext context, CompiledResult formula, List<FieldKey> dimensions) {
        CompileExplode explode = explodes.get(context.key().table());
        return explode.promote(formula, dimensions);
    }

    List<FieldKey> combineDimensions(CompileContext context, List<FieldKey> left, List<FieldKey> right) {
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
                    + ". Field: " + totalKey.field() + ". Number: " + totalKey.number());
        }

        if (object == null && key.isField()) {
            ParsedField pivot = (ParsedField) parsed.get(CompilePivot.pivotKey(key.table()));
            CompileUtil.verify(pivot != null, "The field '%s' does not exist in the table '%s'.",
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
}
