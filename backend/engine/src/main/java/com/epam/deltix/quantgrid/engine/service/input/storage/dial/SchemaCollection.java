package com.epam.deltix.quantgrid.engine.service.input.storage.dial;

import java.util.Map;

public record SchemaCollection(String etag, long sizeInBytes, Map<String, Schema> schemas) {
}
