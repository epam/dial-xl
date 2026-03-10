package com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv;

import com.epam.deltix.quantgrid.engine.service.input.CsvInputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.schema.Result;

public record CsvSchemaFile(Result<CsvInputMetadata.CsvTable> entry) {
    public static final CsvSchemaFile EMPTY = new CsvSchemaFile(null);

    public CsvSchemaFile withEntry(Result<CsvInputMetadata.CsvTable> newEntry) {
        return new CsvSchemaFile(newEntry);
    }
}
