package com.epam.deltix.quantgrid.engine;

import com.epam.deltix.quantgrid.parser.ParsedKey;

public record Viewport(ParsedKey key, ComputationType flag, long start, long end, boolean content, boolean raw) {
}