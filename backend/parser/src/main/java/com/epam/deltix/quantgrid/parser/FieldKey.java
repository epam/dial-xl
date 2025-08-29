package com.epam.deltix.quantgrid.parser;

public record FieldKey(String tableName, String fieldName) implements ParsedKey {

    @Override
    public String table() {
        return tableName;
    }

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

    @Override
    public int hashCode() {
        return tableName.hashCode() ^ fieldName.hashCode();
    }
}
