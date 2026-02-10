package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.InputColumnType;

import java.util.List;

public record CsvInputMetadata(String path, String etag, List<CsvColumn> columns)
        implements InputMetadata {
    @Override
    public String identifier() {
        return path + "@" + etag;
    }

    @Override
    public List<String> names() {
        return columns.stream().map(CsvColumn::name).toList();
    }

    @Override
    public List<InputColumnType> types() {
        return columns.stream().map(CsvColumn::type).toList();
    }
}
