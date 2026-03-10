package com.epam.deltix.quantgrid.engine.service.input;

import com.epam.deltix.quantgrid.type.InputColumnType;

public record ColumnMetadata(String name, int index, InputColumnType type) {
}
