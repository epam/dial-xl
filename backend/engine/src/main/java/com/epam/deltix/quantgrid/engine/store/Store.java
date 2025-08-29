package com.epam.deltix.quantgrid.engine.store;

import com.epam.deltix.quantgrid.engine.meta.Meta;
import com.epam.deltix.quantgrid.engine.node.Identity;
import com.epam.deltix.quantgrid.engine.value.Table;

import java.io.IOException;
import java.util.Set;

public interface Store {
    Table load(Identity id, Meta meta) throws IOException;
    void save(Identity id, Table table) throws IOException;
    boolean lock(Identity id);
    void unlock(Identity id);
    Set<Identity> locks();
}
