package com.epam.deltix.quantgrid.engine.service.input.storage.schema.excel;

import com.epam.deltix.quantgrid.engine.service.input.ExcelInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.ExcelCatalog;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.Result;
import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.LinkedHashMap;
import java.util.Map;

public record ExcelSchemaFile(
        Result<ExcelCatalog> catalog,
        Map<String, Result<ExcelInputMetadata.ExcelTable>> entries) {
    public static final ExcelSchemaFile EMPTY = new ExcelSchemaFile(null, Map.of());

    @JsonIgnore
    public ExcelSchemaFile withEntry(String key, Result<ExcelInputMetadata.ExcelTable> newEntry) {
        Map<String, Result<ExcelInputMetadata.ExcelTable>> newEntries = new LinkedHashMap<>(entries);
        newEntries.put(key, newEntry);
        return new ExcelSchemaFile(catalog, newEntries);
    }

    @JsonIgnore
    public ExcelSchemaFile withCatalog(Result<ExcelCatalog> catalog) {
        return new ExcelSchemaFile(catalog, entries);
    }
}
