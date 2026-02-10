package com.epam.deltix.quantgrid.engine.service.input.storage.schema.csv;

import com.epam.deltix.quantgrid.util.ParserException;
import com.fasterxml.jackson.annotation.JsonIgnore;
import com.fasterxml.jackson.annotation.JsonInclude;
import org.jetbrains.annotations.Nullable;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record CsvSchemaEntry(@Nullable CsvTable value, @Nullable String error, long timestamp) {
    @JsonIgnore
    public CsvTable getValueOrThrow() {
        if (error != null) {
            throw new ParserException(error);
        }
        return value;
    }

    @JsonIgnore
    public CsvSchemaEntry withTimestamp(long newTimestamp) {
        return new CsvSchemaEntry(value, error, newTimestamp);
    }
}
