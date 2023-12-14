package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.parser.FieldKey;

public record Viewport(String table, String field, long start, long end, boolean content) {

    public Viewport(FieldKey field, long start, long end, boolean content) {
        this(field.tableName(), field.fieldName(), start, end, content);
    }
}
