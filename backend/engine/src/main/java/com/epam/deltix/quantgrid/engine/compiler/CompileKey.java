package com.epam.deltix.quantgrid.engine.compiler;

import com.epam.deltix.quantgrid.parser.FieldKey;

public record CompileKey(String table, String field, boolean exploded, boolean overridden) {

    public CompileKey(String table) {
        this(table, null, true, true);
    }

    public CompileKey(String table, String field, boolean exploded) {
        this(table, field, exploded, true);
    }

    public CompileKey(FieldKey key, boolean exploded, boolean overridden) {
        this(key.tableName(), key.fieldName(), exploded, overridden);
    }

    public boolean isTable() {
        return field == null;
    }

    public boolean isField() {
        return field != null;
    }

    public FieldKey toFieldKey() {
        return new FieldKey(table, field);
    }
}
