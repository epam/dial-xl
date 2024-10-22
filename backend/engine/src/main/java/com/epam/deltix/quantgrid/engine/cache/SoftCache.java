package com.epam.deltix.quantgrid.engine.cache;

import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.github.benmanes.caffeine.cache.Caffeine;
import org.jetbrains.annotations.Nullable;

public class SoftCache implements Cache {

    private final com.github.benmanes.caffeine.cache.Cache<Identity, Table> caffeine = Caffeine.newBuilder()
            .softValues()
            .build();

    @Override
    public int size() {
        return (int) caffeine.estimatedSize();
    }

    @Override
    public @Nullable Table load(Identity id) {
        return caffeine.getIfPresent(id);
    }

    @Override
    public void save(Identity id, Table value) {
         caffeine.put(id, value);
    }

    @Override
    public void begin() {
    }

    @Override
    public void finish() {
    }

    @Override
    public Cache copy() {
        return this;
    }
}
