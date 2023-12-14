package com.epam.deltix.quantgrid.engine.service;

import com.epam.deltix.quantgrid.engine.service.input.InputMetadata;
import com.epam.deltix.quantgrid.engine.service.input.storage.MetadataProvider;

import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

public class InputMetadataCache {

    final ConcurrentMap<String, InputMetadata> metadataCache = new ConcurrentHashMap<>();

    private final MetadataProvider metadataProvider;

    public InputMetadataCache(MetadataProvider metadataProvider) {
        this.metadataProvider = metadataProvider;
    }

    public InputMetadata getInputMetadata(String input) {
        return metadataCache.computeIfAbsent(input, metadataProvider::read);
    }
}
