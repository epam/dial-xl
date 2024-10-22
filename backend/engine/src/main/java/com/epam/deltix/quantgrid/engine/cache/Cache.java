package com.epam.deltix.quantgrid.engine.cache;

import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.value.Table;
import org.jetbrains.annotations.Nullable;

public interface Cache {

    int size();

    @Nullable
    Table load(Identity id);

    void save(Identity id, Table value);

    void begin();

    void finish();

    Cache copy();
}