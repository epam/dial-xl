package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.InputColumnType;

import java.util.List;

public record ExcelInputMetadata(
        String path,
        String etag,
        ExcelTableKey key,
        ExcelTable table)
        implements InputMetadata {
    @Override
    public String identifier() {
        return "path=" + path + ", etag=" + etag + ", " + key.format();
    }

    @Override
    public List<String> names() {
        return table.columns().stream().map(ColumnMetadata::name).toList();
    }

    @Override
    public List<InputColumnType> types() {
        return table.columns().stream().map(ColumnMetadata::type).toList();
    }

    public record ExcelTable(String sheet, int startRow, int endRow, List<ColumnMetadata> columns) {
    }
}