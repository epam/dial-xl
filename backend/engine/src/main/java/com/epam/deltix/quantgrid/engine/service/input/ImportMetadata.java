package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.InputColumnType;

import java.util.LinkedHashMap;

public record ImportMetadata(
        String path,
        String project,
        String source,
        String sync,
        String dataset,
        long version,
        boolean active,
        LinkedHashMap<String, InputColumnType> columns
) {
}
