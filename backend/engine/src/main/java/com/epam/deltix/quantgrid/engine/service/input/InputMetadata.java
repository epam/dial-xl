package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.ColumnType;

import java.util.LinkedHashMap;

/**
 * Represent input's metadata, containing all available columns.
 *
 * @param name input name
 * @param path resolved input location
 * @param type format of the input
 * @param columnTypes column names and types
 */
public record InputMetadata(
        String name,
        String path,
        String etag,
        InputType type,
        LinkedHashMap<String, ColumnType> columnTypes
) {
}
