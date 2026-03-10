package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.parser.ParsedKey;

public record Viewport(ParsedKey key, ComputationType flag,
                       long startRow, long endRow,
                       long startCol, long endCol,
                       boolean content, boolean raw) {
}