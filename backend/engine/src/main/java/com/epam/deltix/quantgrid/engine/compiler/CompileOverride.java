package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledRow;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledSimpleColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.compiler.result.format.ColumnFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.format.GeneralFormat;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.ResultValidator;
import com.epam.deltix.quantgrid.engine.compiler.result.validator.SimpleColumnValidators;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Overrides;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedOverride;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.ConstBool;
import com.epam.deltix.quantgrid.parser.ast.ConstNumber;
import com.epam.deltix.quantgrid.parser.ast.ConstText;
import com.epam.deltix.quantgrid.parser.ast.Formula;
import com.epam.deltix.quantgrid.type.ColumnType;
import com.epam.deltix.quantgrid.util.Doubles;
import com.epam.deltix.quantgrid.util.Strings;
import it.unimi.dsi.fastutil.ints.IntArrayList;
import it.unimi.dsi.fastutil.ints.IntList;
import it.unimi.dsi.fastutil.objects.Object2IntMap;
import it.unimi.dsi.fastutil.objects.Object2IntOpenHashMap;
import lombok.SneakyThrows;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.IntStream;


class CompileOverride {

    private final Object2IntMap<CompiledRow> keysMap = new Object2IntOpenHashMap<>();
    private final List<CompiledRow> keysList = new ArrayList<>();

    private final CompileContext context;
    private final ParsedTable table;
    private final ParsedOverride overrides;
    private final List<FieldKey> keys;
    private final boolean manual;

    /**
     * Key expressions to apply overrides by.
     * 1. Manual table - Row() before post filter/sorting.
     * 2. Table without keys - Row() after post filter/sorting.
     * 3. Table with keys - key fields at common dimensions.
     */
    private final List<Expression> expressions = new ArrayList<>();

    /**
     * Key dimensions to apply overrides by.
     * 1. Manual table - a fake "manual" dimension before post filter/sorting.
     * 2. Table without keys - all dimensions after post filter/sorting.
     * 3. Table with keys - key common dimensions. Usually before filter/sorting to support usage of overrides on filtered/sorted columns.
     */
    private final List<FieldKey> dimensions = new ArrayList<>();

    private Throwable error;
    private boolean initialized;

    CompileOverride(CompileContext context, ParsedTable table) {
        CompileUtil.verify(context.key().isTable());
        this.context = context;
        this.table = table;
        this.overrides = table.overrides();
        this.manual = CompileManual.isManual(table);
        this.keys = table.fields()
                .stream()
                .flatMap(fields -> fields.fields().stream())
                .filter(ParsedField::isKey)
                .map(field -> new FieldKey(table.tableName(), field.fieldName()))
                .toList();

        this.keysMap.defaultReturnValue(-1);
    }

    boolean canMatchOverride() {
        return !manual || !keys.isEmpty() || table.apply() == null;
    }

    int findOverridePosition(FieldKey fieldKey, CompiledRow rowKeys) {
        init();

        if ((!manual && keys.contains(fieldKey)) || !overrides.map().containsKey(fieldKey)) {
            return -1;
        }

        int index = keysMap.getOrDefault(rowKeys, -1);
        if (index < 0) {
            return -1;
        }

        Formula formula = overrides.map().get(fieldKey).get(index);
        if (formula == null) {
            return -1;
        }

        return index + 1;
    }

    CompiledRow findOverrideRowKeys(int position) {
        init();
        return keysList.get(position - 1);
    }

    @SneakyThrows
    CompiledSimpleColumn compileOverride(CompileContext context) {
        init();

        OverrideKey overrideKey = context.key().overrideKey();
        Formula formula = formula(overrideKey);

        CompiledSimpleColumn override = SimpleColumnValidators.STRING_OR_DOUBLE
                .convert(context.compileFormula(formula));

        CompileUtil.verify(override.scalar(), "Override formula must produce a text or a number. Column: %s[%s]. Position: %d",
                overrideKey.table(), overrideKey.field(), overrideKey.position());

        return override;
    }

    Formula formula(OverrideKey overrideKey) {
        FieldKey fieldKey = new FieldKey(overrideKey.table(), overrideKey.field());
        int position = overrideKey.position();
        return overrides.map().get(fieldKey).get(position - 1);
    }

    CompiledResult compileField(CompileContext context, CompiledResult result) {
        FieldKey field = context.key().fieldKey();
        int[] indices = findOverrideIndices(field);

        if (indices.length == 0) {
            return result;
        }

        CompiledColumn compiledColumn = result.cast(CompiledColumn.class, (expected, actual) ->
                "%s overrides are not supported".formatted(actual));

        init();

        OverrideKeys overrideKeys = buildOverrideRowKeys(indices);
        OverrideValues overrideValues = compileOverrideValues(context, field, compiledColumn, indices);

        CompiledSimpleColumn column = SimpleColumnValidators.forType(overrideValues.type)
                .convert(context.promote(result, dimensions));

        Overrides overridden = new Overrides(expressions, column.node(), overrideKeys.keys, overrideValues.expressions);
        return new CompiledSimpleColumn(overridden, dimensions, overrideValues.format);
    }

    @SneakyThrows
    private void init() {
        if (error != null) {
            throw error;
        }

        if (initialized) {
            return;
        }

        try {
            verifyKeys();

            if (manual) {
                initManualTable();
            } else if (keys.isEmpty()) {
                initTableWithoutKeys();
            } else {
                initTableWithKeys();
            }
        } catch (Throwable e) {
            error = e;
            throw e;
        } finally {
            initialized = true;
        }
    }

    private void initManualTable() {
        dimensions.add(CompileManual.dimension(table));
        CompiledTable layout = context.layout(dimensions);
        expressions.add(CompileUtil.plus(new RowNumber(layout.node()), 1));

        if (keys.isEmpty()) {
            for (int row = 0; row < overrides.size(); row++) {
                CompiledRow key = new CompiledRow(row + 1);
                keysMap.put(key, row);
                keysList.add(key);
            }
        } else {
            initIndexByKeys();
        }
    }

    private void initTableWithoutKeys() {
        CompiledTable layout = context.layout();
        dimensions.addAll(layout.dimensions());
        expressions.add(CompileUtil.plus(new RowNumber(layout.node()), 1));
        List<Formula> formulas = overrides.map().get(overrides.rowKey());

        for (int row = 0; row < overrides.size(); row++) {
            Formula formula = formulas.get(row);
            CompiledRow key = new CompiledRow(parseOverrideKey(ColumnType.DOUBLE, formula));
            int prev = keysMap.put(key, row);
            keysList.add(key);
            CompileUtil.verify(prev < 0, "Duplicate key in overrides. Row: %s", row + 1);
        }
    }

    private void initTableWithKeys() {
        List<FieldKey> dims = List.of();

        for (FieldKey key : keys) {
            CompiledResult keyField = context.currentField(key.fieldName());
            dims = context.combine(dims, keyField.dimensions());
        }

        for (FieldKey key : keys) {
            CompiledResult keyField = context.currentField(key.fieldName());
            Expression keyExpression = context.promote(keyField, dims).cast(CompiledSimpleColumn.class).node();
            expressions.add(keyExpression);
        }

        dimensions.addAll(dims);
        initIndexByKeys();
    }

    private void initIndexByKeys() {
        List<ColumnType> types = keys.stream().map(key -> inferOverrideKeyType(context, key)).toList();

        for (int row = 0; row < overrides.size(); row++) {
            CompiledRow key = new CompiledRow();

            for (int i = 0; i < keys.size(); i++) {
                FieldKey field = keys.get(i);
                ColumnType type = types.get(i);
                List<Formula> formulas = overrides.map().get(field);
                Formula formula = formulas.get(row);
                key.add(parseOverrideKey(type, formula));
            }

            int prev = keysMap.put(key, row);
            keysList.add(key);
            CompileUtil.verify(prev < 0, "Duplicate key in overrides. Row: %s", row + 1);
        }
    }

    private void verifyKeys() {
        boolean hasRowKey = overrides.map().containsKey(overrides.rowKey());

        if (manual) {
            CompileUtil.verify(!hasRowKey, "Override keys is not allowed in manual tables");
        } else if (keys.isEmpty()) {
            CompileUtil.verify(hasRowKey, "Missing row column in override section");
        }

        if (!keys.isEmpty()) {
            Set<FieldKey> definedFields = overrides.map().keySet();
            CompileUtil.verify(!hasRowKey, "row column is not allowed for table with keys");
            CompileUtil.verify(definedFields.containsAll(keys), "Missing overrides keys: " +
                    keys.stream().filter(field -> !definedFields.contains(field))
                            .map(FieldKey::fieldName).toList());
        }
    }

    Map<OverrideKey, Formula> getParsedOverrides() {
        Map<OverrideKey, Formula> map = new HashMap<>();
        for (FieldKey field : overrides.map().keySet()) {
            if (field.equals(overrides.rowKey())) {
                continue;
            }

            int[] indices = findOverrideIndices(field);

            for (int index : indices) {
                Formula formula = overrides.map().get(field).get(index);
                OverrideKey key = new OverrideKey(field.table(), field.fieldName(), index + 1);
                map.put(key, formula);
            }
        }

        return map;
    }

    private int[] findOverrideIndices(FieldKey field) {
        List<Formula> formulas = overrides.map().get(field);

        if ((!manual && keys.contains(field)) || formulas == null) {
            return new int[0];
        }

        return findOverrideIndices(formulas);
    }

    private int[] findOverrideIndices(List<Formula> formulas) {
        IntList indices = new IntArrayList();

        for (int row = 0; row < formulas.size(); row++) {
            Formula formula = formulas.get(row);

            if (formula != null) {
                indices.add(row);
            }
        }

        return indices.toIntArray();
    }

    private OverrideKeys buildOverrideRowKeys(int[] indices) {
        if (manual) {
            List<Object> keys = List.of(IntStream.of(indices).mapToDouble(row -> row + 1).toArray());
            return new OverrideKeys(keys);
        }

        List<Object> keys = new ArrayList<>();

        for (int i = 0; i < expressions.size(); i++) {
            ColumnType type = expressions.get(i).getType();

            if (type.isDouble()) {
                double[] doubles = new double[indices.length];

                for (int j = 0; j < indices.length; j++) {
                    int index = indices[j];
                    doubles[j] = keysList.get(index).getDouble(i);
                }

                keys.add(doubles);
            } else if (type.isString()) {
                String[] strings = new String[indices.length];

                for (int j = 0; j < indices.length; j++) {
                    int row = indices[j];
                    strings[j] = keysList.get(row).getString(i);
                }

                keys.add(strings);
            } else {
                throw new IllegalArgumentException("Not expected type: " + type);
            }
        }

        return new OverrideKeys(keys);
    }

    private ColumnType inferOverrideKeyType(CompileContext context, FieldKey key) {
        CompiledResult result = context.field(key.table(), key.fieldName(), false, false);
        List<Formula> formulas = overrides.map().get(key);
        ColumnType type = result.cast(CompiledColumn.class).type();
        CompileUtil.verify(type.isDouble() || type.isString(), "Allowed to override only string/double fields");

        if (manual && type.isDouble()) {
            for (Formula formula : formulas) {
                if (formula instanceof ConstNumber || formula instanceof ConstBool) {
                    continue;
                }

                if (formula instanceof ConstText) {
                    type = ColumnType.STRING;
                    break;
                }

                throw new CompileError("Override key must be text or number");
            }
        }

        return type;
    }

    public static Object parseOverrideKey(ColumnType type, Formula formula) {
        if (type.isString()) {
            if (formula instanceof ConstText constant) {
                return constant.text();
            }

            if (formula instanceof ConstNumber constant) {
                return Doubles.toString(constant.number(), GeneralFormat.INSTANCE.createFormatter());
            }

            if (formula instanceof ConstBool constant) {
                return constant.value() ? "TRUE" : "FALSE";
            }
        }

        if (type.isDouble()) {
            if (formula instanceof ConstText constant) {
                String text = constant.text();

                if (Strings.isError(text)) {
                    return Strings.toDoubleError(text);
                }

                if (Strings.isEmpty(text)) {
                    return Doubles.EMPTY;
                }

                // VALUE() does not convert TRUE/FALSE into 1/0
                return Double.parseDouble(text);
            }

            if (formula instanceof ConstNumber constant) {
                return constant.number();
            }

            if (formula instanceof ConstBool constant) {
                return constant.value() ? 1 : 0;
            }
        }

        throw new CompileError("Override key must be text or number");
    }

    private OverrideValues compileOverrideValues(
            CompileContext context, FieldKey field, CompiledColumn column, int[] indices) {
        List<CompiledColumn> values = new ArrayList<>();

        ColumnType type = column.type();
        for (int index : indices) {
            CompiledRow key = keysList.get(index);
            CompiledSimpleColumn value;

            try {
                value = context.override(field.tableName(), field.fieldName(), key);
            } catch (CompileError e) {
                value = new CompiledSimpleColumn(new Constant(Doubles.ERROR_NA), List.of(), GeneralFormat.INSTANCE);
            }

            if (value.type().isString()) {
                type = ColumnType.STRING;
            }

            values.add(value);
        }

        ResultValidator<CompiledSimpleColumn> converter = SimpleColumnValidators.forType(type);
        List<CompiledSimpleColumn> compiledColumns = values.stream()
                .map(converter::convert)
                .toList();
        List<Expression> expressions = CompileUtil.toExpressionList(compiledColumns);
        List<ColumnFormat> formats = CompileUtil.toFormatList(compiledColumns, column);
        ColumnFormat resultFormat = FormatResolver.resolveListFormat(type, formats);

        return new OverrideValues(type, resultFormat, expressions);
    }

    private record OverrideKeys(List<Object> keys) {
    }

    private record OverrideValues(ColumnType type, ColumnFormat format, List<Expression> expressions) {
    }
}
