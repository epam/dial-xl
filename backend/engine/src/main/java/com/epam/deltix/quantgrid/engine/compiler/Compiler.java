package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.Viewport;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledNestedColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledPivotTable;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.ResultType;
import com.epam.deltix.quantgrid.engine.graph.Graph;
import com.epam.deltix.quantgrid.engine.node.plan.Scalar;
import com.epam.deltix.quantgrid.engine.node.plan.local.ViewportLocal;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedOverride;
import com.epam.deltix.quantgrid.parser.ParsedSheet;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ParsingError;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import lombok.Getter;
import lombok.RequiredArgsConstructor;
import lombok.experimental.Accessors;
import lombok.extern.slf4j.Slf4j;
import org.jetbrains.annotations.Nullable;

import java.util.ArrayList;
import java.util.Collection;
import java.util.HashMap;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Slf4j
@Accessors(fluent = true)
@RequiredArgsConstructor
public class Compiler {

    private static final String DEFAULT_COMPILATION_ERROR = "Failed to compile field ";

    private final Map<FieldKey, Object> parsed = new HashMap<>();
    private final Map<String, CompileExplode> explodes = new HashMap<>();
    private final Map<String, ParsedOverride> overrides = new HashMap<>();
    private final Map<CompileKey, CompiledResult> compiled = new HashMap<>();
    private final Set<CompileKey> compiling = new HashSet<>();
    // table, viewports
    private final Map<FieldKey, Set<Viewport>> viewports = new HashMap<>();

    private final Map<FieldKey, CompileError> compileErrors = new HashMap<>();

    // reuse across explodes within a single compilation only (at least Executor and Carry rule modify Select)
    @Getter
    private final CompiledTable scalar = new CompiledNestedColumn(new Scalar(), 0);

    @Getter
    private final MetadataProvider metadataProvider;

    public Graph compile(List<ParsedSheet> sheets, Collection<Viewport> viewports) {
        setSheet(sheets);
        setViewports(viewports);

        Graph graph = new Graph();

        for (FieldKey field : this.viewports.keySet()) {
            CompileKey key = new CompileKey(field, true, true);
            try {
                CompiledResult explodedResult = compile(key);
                List<ViewportLocal> viewPortNodes = compileViewports(key, explodedResult);
                viewPortNodes.forEach(graph::add);
            } catch (Exception e) {
                // all errors already stored during compile() method
                // but in some cases (like duplicated tables) they may absent
                // since we don't have a proper solution - they are ignored for now
                // Util.verify(compileErrors.containsKey(key.toFieldKey()));
            }
        }

        return graph;
    }

    public void setSheet(List<ParsedSheet> sheets) {
        List<ParsedTable> tables = new ArrayList<>();
        List<ParsingError> errors = new ArrayList<>();

        for (ParsedSheet sheet : sheets) {
            tables.addAll(sheet.getTables());
            errors.addAll(sheet.getErrors());
        }

        for (ParsingError error : errors) {
            log.warn("Parsing error: {}", error);
        }

        Set<FieldKey> duplicates = getDuplicatedFieldKeys(tables);
        for (ParsedTable table : tables) {
            String tableName = table.getTableName();
            FieldKey tableKey = new FieldKey(tableName, null);
            if (duplicates.contains(tableKey)) {
                compileErrors.put(tableKey,
                        new CompileError(
                                "Table names must be unique across the project, duplicated name: " + tableName));
                continue;
            }

            ParsedOverride overrides = table.getOverrides();
            if (overrides != null) {
                this.overrides.put(table.getTableName(), overrides);
            }

            List<ParsedField> uniqueFields = new ArrayList<>();
            for (ParsedField field : table.getFields()) {
                FieldKey fieldKey = field.getKey();
                if (duplicates.contains(fieldKey)) {
                    compileErrors.put(fieldKey,
                            new CompileError("Table %s contains duplicated field %s".formatted(tableName, fieldKey.fieldName())));
                } else {
                    parsed.put(field.getKey(), field);
                    uniqueFields.add(field);
                }
            }

            parsed.put(tableKey, ParsedTable.builder()
                    .fields(uniqueFields)
                    .tableName(tableName)
                    .overrides(table.getOverrides())
                    .decorators(table.getDecorators())
                    .build());
        }
    }

    public Map<FieldKey, String> compileErrors() {
        Map<FieldKey, String> result = new HashMap<>();
        for (Map.Entry<FieldKey, CompileError> entry : compileErrors.entrySet()) {
            FieldKey fieldKey = entry.getKey();
            CompileError exception = entry.getValue();
            String errorMessage = exception.getMessage() == null
                    ? defaultErrorMessage(fieldKey) : exception.getMessage();
            result.put(fieldKey, errorMessage);
        }
        return result;
    }

    private static String defaultErrorMessage(FieldKey key) {
        return DEFAULT_COMPILATION_ERROR + key;
    }

    private Set<FieldKey> getDuplicatedFieldKeys(List<ParsedTable> tables) {
        Map<String, List<ParsedTable>> groupedTables = tables.stream()
                .collect(Collectors.groupingBy(ParsedTable::getTableName, Collectors.toList()));

        Set<FieldKey> duplicates = new HashSet<>();
        for (Map.Entry<String, List<ParsedTable>> tableEntry : groupedTables.entrySet()) {
            String tableName = tableEntry.getKey();
            List<ParsedTable> tableGroup = tableEntry.getValue();
            if (tableGroup.size() > 1) {
                duplicates.add(new FieldKey(tableName, null));
                continue;
            }

            ParsedTable table = tableGroup.get(0);
            Map<String, List<ParsedField>> groupedFields = table.getFields().stream()
                    .collect(Collectors.groupingBy(f -> f.getKey().fieldName(), Collectors.toList()));

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
            String table = viewport.table();
            String field = viewport.field();
            Set<Viewport> ranges = viewports.computeIfAbsent(new FieldKey(table, field), t -> new HashSet<>());
            ranges.add(viewport);
        }

        parsed.keySet().forEach(fieldKey -> {
            if (!fieldKey.isTable() && !viewports.containsKey(fieldKey)) {
                viewports.put(fieldKey, Set.of(new Viewport(fieldKey, -1, -1, false)));
            }
        });
    }

    CompiledResult compile(CompileKey key) {
        CompiledResult result = compiled.get(key);
        if (result != null) {
            return result;
        }

        CompileError error = compileErrors.get(key.toFieldKey());
        if (error != null) {
            throw error;
        }

        CompileUtil.verify(parsedObject(key) != null);

        if (!compiling.add(key)) {
            throw new CompileError("Cyclic dependency: " + key.toFieldKey());
        }

        try {
            result = key.isTable() ? compileExplode(key) : compileField(key);
            compiled.put(key, result);
        } catch (Throwable exception) {
            log.warn("Compile error: {}. Error: ", key, exception);
            error = exception instanceof CompileError e ? e : new CompileError(exception);
            compileErrors.put(key.toFieldKey(), error);
        }

        compiling.remove(key);

        if (error != null) {
            throw error;
        }

        return result;
    }

    private CompiledTable compileExplode(CompileKey key) {
        ParsedTable table = parsedObject(key);
        List<FieldKey> dimensions = table.getFields()
                .stream()
                .filter(ParsedField::isDim)
                .map(ParsedField::getKey)
                .toList();

        CompileExplode explode;
        if (CompileManual.isManualTable(table)) {
            explode = CompileManual.compileManualTable(key.table(), table.getOverrides(), dimensions, scalar);
            explodes.put(key.table(), explode);
        } else {
            explode = new CompileExplode(dimensions, scalar, false);
            explodes.put(key.table(), explode);

            for (FieldKey dimension : dimensions) {
                compile(new CompileKey(dimension, false, false));
            }
        }

        return explode.layout();
    }

    private CompiledResult compileField(CompileKey key) {
        FieldKey fieldKey = key.toFieldKey();
        if (key.exploded()) {
            return compileExplodedField(fieldKey);
        } else if (key.overridden()) {
            return compileOverriddenField(fieldKey);
        } else {
            return compileUnexplodedField(fieldKey);
        }
    }

    private CompiledResult compileExplodedField(FieldKey fieldKey) {
        String tableName = fieldKey.tableName();
        compile(new CompileKey(tableName));

        CompileExplode explode = explodes.get(tableName);
        CompiledResult result = compile(new CompileKey(fieldKey, false, true));
        return explode.promote(result, explode.dimensions());
    }

    private CompiledResult compileOverriddenField(FieldKey fieldKey) {
        String table = fieldKey.tableName();
        CompiledResult result = compile(new CompileKey(fieldKey, false, false));
        CompileExplode explode = explodes.get(table);
        ParsedOverride override = overrides.get(table);

        if (override != null && override.fields().containsKey(fieldKey)) {
            CompileContext context = new CompileContext(this, new CompileKey(fieldKey, false, true));
            return CompileOverride.compileOverrideField(fieldKey, result, context, override, explode.isManual());
        }

        return result;
    }

    private CompiledResult compileUnexplodedField(FieldKey fieldKey) {
        CompileExplode explode = explodes.get(fieldKey.tableName());
        ParsedField field = (ParsedField) parsed.get(fieldKey);

        CompileContext context = new CompileContext(this, new CompileKey(fieldKey, false, false));
        CompiledResult result = compileFormula(context, field.getFormula());

        if (field.isDim()) {
            result = explode.add(result, fieldKey);
        }

        return result;
    }

    private List<ViewportLocal> compileViewports(CompileKey key, CompiledResult explodedResult) {
        CompiledResult unexplodedResult = compile(new CompileKey(key.toFieldKey(), false, true));
        CompileContext context = new CompileContext(this, key);
        Set<Viewport> viewports = this.viewports.getOrDefault(key.toFieldKey(), new HashSet<>());
        List<ViewportLocal> viewportPlans = new ArrayList<>();
        ResultType resultType = ResultType.toResultType(explodedResult);

        for (Viewport viewport : viewports) {
            ViewportLocal viewportPlan = CompileViewport.compileViewport(
                    context,
                    key.toFieldKey(),
                    resultType,
                    unexplodedResult,
                    explodedResult.dimensions(),
                    viewport);

            viewportPlans.add(viewportPlan);
        }

        if (unexplodedResult instanceof CompiledPivotTable pivot) { // just to cache, should be revisited
            List<ViewportLocal> views = CompileViewport.compilePivotViewports(key.toFieldKey(), pivot);
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

    @Nullable
    @SuppressWarnings("unchecked")
    <T> T parsedObject(CompileKey key) {
        FieldKey fieldKey = new FieldKey(key.table(), key.field());
        Object object = parsed.get(fieldKey);

        if (object == null) {
            CompileUtil.verify(key.isField(), "Unknown table: %s", key.table());
            ParsedField pivot = (ParsedField) parsed.get(CompilePivot.pivotKey(key.table()));
            CompileUtil.verify(pivot != null, "Unknown table: %s, field: %s", key.table(), key.field());

            object = CompilePivot.pivotParsedField(fieldKey);
            parsed.put(fieldKey, object);
        }

        return (T) object;
    }
}
