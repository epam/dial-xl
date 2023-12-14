package com.epam.deltix.quantgrid.parser;

public record FieldKey(String tableName, String fieldName) {

    @Override
    public String toString() {
        if (fieldName != null) {
            return "%s[%s]".formatted(tableName, fieldName);
        }
        return tableName;
    }

    public boolean isTable() {
        return fieldName == null;
    }
}
