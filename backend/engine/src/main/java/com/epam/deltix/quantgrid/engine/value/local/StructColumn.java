package com.epam.deltix.quantgrid.engine.value.local;

import com.epam.deltix.quantgrid.engine.value.Column;
import com.epam.deltix.quantgrid.engine.value.Table;
import com.epam.deltix.quantgrid.type.ColumnType;
import lombok.Value;

import java.util.List;

/**
 * Contains a nested structure that is represented as one column.
 * The schema is computed dynamically. Used by PIVOT and UNPIVOT.
 */
@Value
public class StructColumn implements Column {
    List<String> names;
    List<ColumnType> types;
    Table table;

    @Override
    public long size() {
        return table.size();
    }
}