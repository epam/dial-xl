package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.parser.FieldKey;
import com.epam.deltix.quantgrid.parser.OverrideKey;
import com.epam.deltix.quantgrid.parser.ParsedKey;
import com.epam.deltix.quantgrid.parser.TableKey;
import com.epam.deltix.quantgrid.parser.TotalKey;

public record CompileKey(ParsedKey key, boolean exploded, boolean overridden) {

    public boolean isTable() {
        return (key instanceof TableKey);
    }

    public boolean isField() {
        return (key instanceof FieldKey);
    }

    public boolean isTotal() {
        return (key instanceof TotalKey);
    }

    public boolean isOverride() {
        return (key instanceof OverrideKey);
    }

    public String table() {
        return key.table();
    }

    public TableKey tableKey() {
        return (TableKey) key;
    }

    public FieldKey fieldKey() {
        return (FieldKey) key;
    }

    public TotalKey totalKey() {
        return (TotalKey) key;
    }

    public OverrideKey overrideKey() {
        return (OverrideKey) key;
    }

    public static CompileKey tableKey(String name) {
        return new CompileKey(new TableKey(name), true, true);
    }

    public static CompileKey fieldKey(String table, String field, boolean exploded, boolean overridden) {
        return fieldKey(new FieldKey(table, field), exploded, overridden);
    }

    public static CompileKey fieldKey(FieldKey key, boolean exploded, boolean overridden) {
        return new CompileKey(key, exploded, overridden);
    }

    public static CompileKey totalKey(String table, String field, int number) {
        return new CompileKey(new TotalKey(table, field, number), true, true);
    }

    public static CompileKey totalKey(TotalKey key) {
        return new CompileKey(key, true, true);
    }

    public static CompileKey overrideKey(OverrideKey key) {
        return new CompileKey(key, true, true);
    }

    public static CompileKey fromKey(ParsedKey key) {
        if (key instanceof TableKey tableKey) {
            return tableKey(tableKey.table());
        }

        if (key instanceof FieldKey fieldKey) {
            return fieldKey(fieldKey, true, true);
        }

        if (key instanceof TotalKey totalKey) {
            return totalKey(totalKey);
        }

        if (key instanceof OverrideKey overrideKey) {
            return overrideKey(overrideKey);
        }

        throw new IllegalArgumentException("Unsupported key type: " + key);
    }
}
