package com.epam.deltix.quantgrid.engine.service.input.storage;

import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;

import java.io.IOException;
import java.security.Principal;
import java.util.List;

public interface DataStore {
    Table readTable(String path, List<ColumnType> columnTypes, Principal principal) throws IOException;

    void writeTable(String path, Table table, Principal principal) throws IOException;
}
