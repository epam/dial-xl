package com.epam.deltix.quantgrid.parser;

import com.epam.deltix.quantgrid.service.parser.OverrideValue;
import com.epam.deltix.quantgrid.type.ColumnType;
import org.jetbrains.annotations.Nullable;

import java.util.List;
import java.util.Map;

/**
 * @param rowNumberKey - defined if and only if table has no keys; overrides applied by row number
 * @param keys - defined if and only if table has keys; overrides applied according to the keys
 * @param fields - fields to override
 * @param size - number of rows in override section
 */
public record ParsedOverride(@Nullable TypedValue rowNumberKey,
                             Map<FieldKey, TypedValue> keys,
                             Map<FieldKey, TypedValue> fields,
                             int size) {

    public boolean contains(FieldKey fieldKey) {
        return keys.containsKey(fieldKey) || fields.containsKey(fieldKey);
    }


    @Nullable
    public TypedValue getValues(FieldKey key) {
        TypedValue typedValue = fields.get(key);
        if (typedValue == null) {
            typedValue = keys.get(key);
        }

        return typedValue;
    }

    public record TypedValue(ColumnType type, List<OverrideValue> value) {
    }
}
