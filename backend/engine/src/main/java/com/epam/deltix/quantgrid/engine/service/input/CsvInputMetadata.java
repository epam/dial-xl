package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.InputColumnType;

import java.util.List;

public record CsvInputMetadata(String path, String etag, CsvTable table)
        implements InputMetadata {
    @Override
    public String identifier() {
        return "path=" + path + ", etag=" + etag;
    }

    @Override
    public List<String> names() {
        return table.columns().stream().map(ColumnMetadata::name).toList();
    }

    @Override
    public List<InputColumnType> types() {
        return table.columns().stream().map(ColumnMetadata::type).toList();
    }

    public record CsvTable(List<ColumnMetadata> columns) {
    }
}
