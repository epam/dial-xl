package com.epam.deltix.quantgrid.engine.cache;

import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.value.Table;
import org.jetbrains.annotations.Nullable;

public class EmptyCache implements Cache {

    public static final EmptyCache INSTANCE = new EmptyCache();

    private EmptyCache() {
    }

    @Override
    public int size() {
        return 0;
    }

    @Override
    public void begin() {
    }

    @Override
    public void finish() {
    }

    @Nullable
    @Override
    public Table load(Identity id) {
        return null;
    }

    @Override
    public void save(Identity id, Table value) {
    }

    @Override
    public Cache copy() {
        return this;
    }
}
