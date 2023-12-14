package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.engine.compiler.result.CompiledColumn;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledResult;
import com.epam.deltix.quantgrid.engine.compiler.result.CompiledTable;
import com.epam.deltix.quantgrid.engine.node.expression.BinaryOperator;
import com.epam.deltix.quantgrid.engine.node.expression.Constant;
import com.epam.deltix.quantgrid.engine.node.expression.Expand;
import com.epam.deltix.quantgrid.engine.node.expression.Expression;
import com.epam.deltix.quantgrid.engine.node.expression.Overrides;
import com.epam.deltix.quantgrid.engine.node.expression.RowNumber;
import com.epam.deltix.quantgrid.engine.node.expression.Text;
import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.ParsedField;
import com.epam.deltix.quantgrid.parser.ParsedOverride;
import com.epam.deltix.quantgrid.parser.ParsedTable;
import com.epam.deltix.quantgrid.parser.ast.BinaryOperation;
import com.epam.deltix.quantgrid.service.parser.OverrideValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import it.unimi.dsi.fastutil.Pair;
import it.unimi.dsi.fastutil.objects.ObjectArrayList;
import lombok.experimental.UtilityClass;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.stream.IntStream;

@UtilityClass
public class CompileOverride {

    static CompiledResult compileOverrideField(FieldKey field,
                                               CompiledResult compiledField,
                                               CompileContext context,
                                               ParsedOverride overrides,
                                               boolean manual) {
        ParsedTable parsedTable = context.parsedTable(field.tableName());
        List<FieldKey> tableKeys = parsedTable.getFields()
                .stream()
                .filter(ParsedField::isKey)
                .map(ParsedField::getKey)
                .toList();

        // validate provided override keys with keys defined in table
        validateOverrideKeys(overrides, tableKeys, manual);

        List<Expression> keyExpressions = new ArrayList<>();
        List<ParsedOverride.TypedValue> keyOverrides = new ArrayList<>();
        ParsedOverride.TypedValue valueOverrides = overrides.fields().get(field);
        ParsedOverride.TypedValue rowNumberKey = overrides.rowNumberKey();
        CompiledTable layout = context.layout();

        if (manual) {
            List<OverrideValue> keys = IntStream.range(1, overrides.size() + 1).mapToObj(OverrideValue::new).toList();
            rowNumberKey = new ParsedOverride.TypedValue(ColumnType.INTEGER, keys);
        }

        if (rowNumberKey != null) {
            BinaryOperator key = new BinaryOperator(
                    new RowNumber(layout.node()),
                    new Expand(layout.node(), new Constant(1)),
                    BinaryOperation.ADD);

            keyExpressions.add(key);
            keyOverrides.add(rowNumberKey);
        }

        for (FieldKey key : overrides.keys().keySet().stream().toList()) {
            keyExpressions.add((Expression) context.currentField(key.fieldName(), true).node());
            keyOverrides.add(overrides.keys().get(key));
        }

        Pair<List<ParsedOverride.TypedValue>, ParsedOverride.TypedValue> pair = filter(keyOverrides, valueOverrides);
        keyOverrides = pair.key();
        valueOverrides = pair.value();

        if (valueOverrides.value().isEmpty()) {
            return compiledField;
        }

        // promote original column to fully exploded
        CompiledColumn promotedField = context.promote(compiledField, layout.dimensions()).cast(CompiledColumn.class);
        ColumnType type = promotedField.type();

        CompileUtil.verify(type.isDouble() || type.isString(),
                "Could not apply overrides for the column " + field + " of type " + type);

        Expression expression = promotedField.node();

        if (type.isDouble() && valueOverrides.type().isString()) {
            expression = new Text(expression, type, null);
        }

        Overrides overridden = new Overrides(expression, keyExpressions, valueOverrides, keyOverrides);
        return new CompiledColumn(overridden, promotedField.dimensions());
    }

    private static void validateOverrideKeys(ParsedOverride overrides, List<FieldKey> tableKeys, boolean manual) {
        Map<FieldKey, ParsedOverride.TypedValue> overrideKeys = overrides.keys();
        ParsedOverride.TypedValue rowNumberKey = overrides.rowNumberKey();

        if (manual) {
            CompileUtil.verify(rowNumberKey == null, "Override keys is not allowed in manual tables");
            CompileUtil.verify(overrideKeys.isEmpty(), "Override keys is not allowed in manual tables");
        } else if (tableKeys.isEmpty()) {
            CompileUtil.verify(rowNumberKey != null, "Missing row column in override section");
            CompileUtil.verify(overrideKeys.isEmpty(), "Unknown table keys "
                    + overrideKeys.keySet().stream().map(FieldKey::fieldName).toList());
        } else {
            CompileUtil.verify(rowNumberKey == null, "row column is not allowed for table with keys");
            CompileUtil.verify(
                    overrideKeys.size() == tableKeys.size()
                            && overrideKeys.keySet().containsAll(tableKeys),
                    "Invalid override keys provided, expected "
                            + tableKeys.stream().map(FieldKey::fieldName).toList()
                            + " but " + overrideKeys.keySet().stream().map(FieldKey::fieldName).toList() + " provided");
        }
    }

    /**
     * Filters missing overrides for this column.
     * row,[a],[b]
     * 1,,1       - filters a missing override for [a]
     * 2,2,       - filters a missing override for [b]
     */
    private Pair<List<ParsedOverride.TypedValue>, ParsedOverride.TypedValue> filter(
            List<ParsedOverride.TypedValue> keys, ParsedOverride.TypedValue value) {

        if (!hasMissing(value)) {
            return Pair.of(keys, value);
        }

        List<ParsedOverride.TypedValue> resultKeys = new ArrayList<>();
        ParsedOverride.TypedValue resultValue = new ParsedOverride.TypedValue(value.type(), new ObjectArrayList<>());

        for (ParsedOverride.TypedValue key : keys) {
            resultKeys.add(new ParsedOverride.TypedValue(key.type(), new ObjectArrayList<>()));
        }

        for (int i = 0; i < value.value().size(); i++) {
            OverrideValue overrideValue = value.value().get(i);

            if (!overrideValue.isMissing()) {
                resultValue.value().add(overrideValue);

                for (int j = 0; j < keys.size(); j++) {
                    OverrideValue overrideKey = keys.get(j).value().get(i);
                    resultKeys.get(j).value().add(overrideKey);
                }
            }
        }

        return Pair.of(resultKeys, resultValue);
    }

    private boolean hasMissing(ParsedOverride.TypedValue value) {
        for (int i = 0; i < value.value().size(); i++) {
            OverrideValue overrideValue = value.value().get(i);

            if (overrideValue.isMissing()) {
                return true;
            }
        }

        return false;
    }
}
