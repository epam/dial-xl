package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.parser.FieldKey;

public record ControlRequest(FieldKey key, String query, long startRow, long endRow) {
}