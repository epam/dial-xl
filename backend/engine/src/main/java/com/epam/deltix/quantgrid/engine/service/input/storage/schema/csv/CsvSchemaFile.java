package com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv;

public record CsvSchemaFile(CsvSchemaEntry entry) {
    public static final CsvSchemaFile EMPTY = new CsvSchemaFile(null);

    public CsvSchemaFile withEntry(CsvSchemaEntry newEntry) {
        return new CsvSchemaFile(newEntry);
    }
}
